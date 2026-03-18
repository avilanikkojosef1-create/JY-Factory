import React, { createContext, useContext, useEffect, useState } from 'react';
import { ADMIN_EMAIL } from '../constants';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  FirebaseUser, 
  signInWithPopup, 
  googleProvider, 
  signOut,
  doc,
  getDoc,
  setDoc,
  OperationType,
  handleFirestoreError
} from '../firebase';

interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  hasPassword: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setAppPassword: (password: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Sync user profile to Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // New user, create profile
            const isDefaultAdmin = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL;
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              role: isDefaultAdmin ? 'admin' : 'viewer',
              status: 'Active',
              avatar: firebaseUser.photoURL || '',
              invitedDate: new Date().toLocaleDateString(),
              hasPassword: false
            });
            setIsAdmin(isDefaultAdmin);
            setHasPassword(false);
          } else {
            const data = userDoc.data();
            const isDefaultAdmin = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL;
            setIsAdmin(data.role === 'admin' || isDefaultAdmin);
            setHasPassword(!!data.hasPassword);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setIsAdmin(false);
        setHasPassword(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'An unknown error occurred during login.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const setAppPassword = async (password: string) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { 
        hasPassword: true,
        appPassword: password // In a real app, this should be hashed server-side
      }, { merge: true });
      setHasPassword(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, isAdmin, hasPassword, loginError, login, logout, setAppPassword }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      try {
        const parsed = JSON.parse(event.message);
        if (parsed.error && parsed.operationType) {
          setHasError(true);
          setErrorMsg(`Firestore ${parsed.operationType} error at ${parsed.path}: ${parsed.error}`);
        }
      } catch {
        // Not a Firestore error
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Database Error</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
