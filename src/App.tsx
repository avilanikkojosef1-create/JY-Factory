/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FirebaseProvider, useFirebase, ErrorBoundary } from './components/FirebaseProvider';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SetupPassword from './components/SetupPassword';

function AppContent() {
  const { user, loading, hasPassword, logout } = useFirebase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  if (!hasPassword) {
    return <SetupPassword />;
  }

  return <Dashboard onLogout={logout} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <AppContent />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}

