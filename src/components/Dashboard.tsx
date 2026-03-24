import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smile, 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Briefcase, 
  Layers, 
  FileText, 
  Palette, 
  UserCircle, 
  Bot, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Sun,
  ChevronRight,
  Grid,
  List as ListIcon,
  Sparkles,
  BarChart3,
  UserPlus,
  X,
  Clock,
  FileSpreadsheet,
  Download,
  Play,
  Square,
  Pause,
  Image,
  MessageSquare,
  Send,
  Paperclip,
  Trash2,
  Calendar,
  Camera
} from 'lucide-react';
import { ViewType, Task, Priority, Status, StaffMember, Client, TimeEntry } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { useFirebase } from './FirebaseProvider';
import imageCompression from 'browser-image-compression';
import { 
  db, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocs,
  handleFirestoreError,
  OperationType,
  storage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  arrayUnion,
  arrayRemove
} from '../firebase';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { user, isAdmin: contextIsAdmin } = useFirebase();
  const isAdmin = contextIsAdmin || user?.email?.toLowerCase() === ADMIN_EMAIL;
  const [currentView, setCurrentView] = useState<ViewType>('My Tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<{
    startTime: string;
    clientId: string;
    clientName: string;
    taskId?: string;
    taskTitle?: string;
    description: string;
  } | null>(() => {
    const saved = localStorage.getItem('activeTimer');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isInviteStaffOpen, setIsInviteStaffOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Sync Tasks from Firestore
  useEffect(() => {
    if (!user) return;
    
    const tasksQuery = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      console.log(`Firestore: onSnapshot received ${snapshot.docs.length} tasks.`);
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id as any,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    }, (error) => {
      console.error("Firestore: onSnapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Staff from Firestore
  useEffect(() => {
    if (!user) return;

    const staffQuery = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(staffQuery, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id as any,
        ...doc.data()
      })) as StaffMember[];
      setStaff(staffData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Clients from Firestore
  useEffect(() => {
    if (!user) return;

    const clientsQuery = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Time Entries from Firestore
  useEffect(() => {
    if (!user) return;

    const timeEntriesQuery = query(collection(db, 'timeEntries'), orderBy('startTime', 'desc'));
    const unsubscribe = onSnapshot(timeEntriesQuery, (snapshot) => {
      const timeEntriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimeEntry[];
      setTimeEntries(timeEntriesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'timeEntries');
    });

    return () => unsubscribe();
  }, [user]);

  // Save active timer to localStorage
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem('activeTimer', JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem('activeTimer');
    }
  }, [activeTimer]);
  const handleAddTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      await addDoc(collection(db, 'tasks'), {
        ...taskData,
        createdAt: new Date().toISOString()
      });
      setIsAddTaskOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      console.log(`Updating task ${id} with:`, updates);
      await updateDoc(doc(db, 'tasks', id), updates);
      console.log(`Task ${id} updated successfully.`);
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const handleInviteStaff = async (inviteData: any) => {
    try {
      // In a real app, this would trigger a Cloud Function to send an email
      // For now, we'll just add them to the users collection as "Pending"
      await addDoc(collection(db, 'users'), {
        uid: `pending_${Date.now()}`,
        name: inviteData.name,
        email: inviteData.email,
        role: inviteData.role,
        status: 'Pending',
        avatar: `https://picsum.photos/seed/${inviteData.name}/100/100`,
        invitedDate: new Date().toLocaleDateString()
      });
      setIsInviteStaffOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const handleAddClient = async (clientData: Omit<Client, 'id'>) => {
    try {
      await addDoc(collection(db, 'clients'), clientData);
      setIsAddClientOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'Dashboard':
        return <DashboardView tasks={tasks} clients={clients} staff={staff} timeEntries={timeEntries} />;
      case 'My Tasks':
        return <TasksView title="My Tasks" description="Tasks assigned to you across all clients" tasks={tasks.filter(t => t.assignedTo === user?.uid)} clients={clients} staff={staff} onAddTask={() => setIsAddTaskOpen(true)} setConfirmModal={setConfirmModal} setAlertModal={setAlertModal} onUpdateTask={handleUpdateTask} />;
      case 'All Tasks':
        return <TasksView title="All Tasks" description="All tasks in the system across all clients" tasks={tasks} clients={clients} staff={staff} onAddTask={() => setIsAddTaskOpen(true)} setConfirmModal={setConfirmModal} setAlertModal={setAlertModal} onUpdateTask={handleUpdateTask} />;
      case 'Clients':
        return <ClientsView clients={clients} onAddClient={() => setIsAddClientOpen(true)} setConfirmModal={setConfirmModal} setAlertModal={setAlertModal} />;
      case 'Time Tracker':
        return <TimeTrackerView activeTimer={activeTimer} setActiveTimer={setActiveTimer} clients={clients} tasks={tasks} user={user} />;
      case 'Timesheets':
        return <TimesheetsView timeEntries={timeEntries} isAdmin={isAdmin} />;
      case 'Staff':
        return <StaffView staff={staff} onInvite={() => setIsInviteStaffOpen(true)} setConfirmModal={setConfirmModal} setAlertModal={setAlertModal} />;
      case 'Settings':
        return <SettingsView />;
      default:
        return <PlaceholderView title={currentView} description={`This is the ${currentView} section.`} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            P
          </div>
          <span className="font-bold text-slate-800 text-xl tracking-tight">JY Factory</span>
        </div>

        <div className="flex-1 px-3 space-y-6">
          <SidebarSection title="MAIN">
            <SidebarItem 
              icon={<LayoutDashboard size={18} />} 
              label="Dashboard" 
              active={currentView === 'Dashboard'} 
              onClick={() => setCurrentView('Dashboard')} 
            />
            <SidebarItem 
              icon={<CheckSquare size={18} />} 
              label="My Tasks" 
              active={currentView === 'My Tasks'} 
              onClick={() => setCurrentView('My Tasks')} 
            />
          </SidebarSection>

          <SidebarSection title="TASK MANAGEMENT">
            <SidebarItem 
              icon={<Users size={18} />} 
              label="Clients" 
              active={currentView === 'Clients'} 
              onClick={() => setCurrentView('Clients')} 
            />
            <SidebarItem 
              icon={<Layers size={18} />} 
              label="All Tasks" 
              active={currentView === 'All Tasks'} 
              onClick={() => setCurrentView('All Tasks')} 
            />
            <SidebarItem 
              icon={<Clock size={18} />} 
              label="Time Tracker" 
              active={currentView === 'Time Tracker'} 
              onClick={() => setCurrentView('Time Tracker')} 
            />
            <SidebarItem 
              icon={<FileSpreadsheet size={18} />} 
              label="Timesheets" 
              active={currentView === 'Timesheets'} 
              onClick={() => setCurrentView('Timesheets')} 
            />
          </SidebarSection>

          <SidebarSection title="ADMINISTRATION">
            <SidebarItem 
              icon={<UserCircle size={18} />} 
              label="Staff" 
              active={currentView === 'Staff'} 
              onClick={() => setCurrentView('Staff')} 
            />
            <SidebarItem 
              icon={<Bot size={18} />} 
              label="AI Agents" 
              active={currentView === 'AI Agents'} 
              onClick={() => setCurrentView('AI Agents')} 
            />
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="Settings" 
              active={currentView === 'Settings'} 
              onClick={() => setCurrentView('Settings')} 
            />
          </SidebarSection>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-4">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-lg transition-colors text-sm font-medium"
          >
            <UserCircle size={18} />
            My Profile
          </button>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <img 
                src={staff.find(s => s.id === user?.uid)?.avatar || user?.photoURL || 'https://picsum.photos/seed/user/100/100'} 
                alt="User" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {staff.find(s => s.id === user?.uid)?.name || user?.displayName || 'User'}
                </p>
                {isAdmin && (
                  <span className="px-1 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded border border-blue-100 uppercase tracking-tighter">Admin</span>
                )}
              </div>
              {staff.find(s => s.id === user?.uid)?.designation && (
                <p className="text-[10px] text-blue-600 font-bold truncate uppercase tracking-wider">
                  {staff.find(s => s.id === user?.uid)?.designation}
                </p>
              )}
              <p className="text-[10px] text-slate-400 font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-12 py-1.5 bg-slate-100/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-400 font-bold">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTimer && (
              <div 
                onClick={() => setCurrentView('Time Tracker')}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-all animate-pulse"
              >
                <Clock size={14} />
                <span className="text-xs font-bold font-mono">Timer Active</span>
              </div>
            )}
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto">
          {renderView()}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddTaskOpen && (
          <AddTaskModal 
            clients={clients}
            staff={staff}
            onClose={() => setIsAddTaskOpen(false)} 
            onAdd={handleAddTask} 
          />
        )}
        {isInviteStaffOpen && (
          <InviteStaffModal 
            onClose={() => setIsInviteStaffOpen(false)} 
            onInvite={handleInviteStaff} 
          />
        )}
        {isAddClientOpen && (
          <AddClientModal 
            onClose={() => setIsAddClientOpen(false)} 
            onAdd={handleAddClient} 
          />
        )}
        {isProfileOpen && (
          <MyProfileModal 
            onClose={() => setIsProfileOpen(false)} 
            staffMember={staff.find(s => s.id === user?.uid)}
          />
        )}
        {confirmModal.isOpen && (
          <ConfirmationModal 
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}
        {alertModal.isOpen && (
          <AlertModal 
            title={alertModal.title}
            message={alertModal.message}
            onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase">{title}</h3>
      {children}
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all text-sm font-medium ${
        active 
          ? 'bg-blue-50 text-blue-600 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TasksView({ title, description, tasks, clients, staff, onAddTask, setConfirmModal, setAlertModal, onUpdateTask }: { 
  title: string,
  description: string,
  tasks: Task[], 
  clients: Client[],
  staff: StaffMember[],
  onAddTask: () => void,
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>,
  setAlertModal: React.Dispatch<React.SetStateAction<any>>,
  onUpdateTask: (id: string, updates: Partial<Task>) => void
}) {
  const { user, isAdmin: contextIsAdmin } = useFirebase();
  const isAdmin = contextIsAdmin || user?.email?.toLowerCase() === ADMIN_EMAIL;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const handleDeleteTask = async (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tasks', taskId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
        }
      }
    });
  };

  const statuses: Status[] = [
    'Listing To Do',
    'Design To Do',
    'Design Confirm Request',
    'Confirm Request Final',
    'Confirmed',
    'Listing Completed'
  ];

  return (
    <div className="p-8 space-y-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        </div>
        <button 
          onClick={onAddTask}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex gap-6 min-w-max h-full">
          {statuses.map(status => {
            const filteredTasks = tasks.filter(t => t.status === status);
            
            return (
              <div key={status} className="w-80 flex flex-col bg-slate-50/50 rounded-3xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredTasks.length}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredTasks.map((task) => (
                      <motion.div 
                        key={task.id}
                        layoutId={task.id.toString()}
                        onClick={() => setSelectedTaskId(task.id as string)}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
                      >
                      <div className="flex justify-between items-start mb-3">
                        <PriorityBadge priority={task.priority} />
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id as any);
                            }}
                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      
                      <h3 className="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{task.title}</h3>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {task.clientName || 'No Client'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {task.dueDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-white overflow-hidden">
                            <img src={`https://picsum.photos/seed/${task.assignedToName}/50/50`} alt={task.assignedToName} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">{task.assignedToName || 'Unassigned'}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-slate-400">
                            <MessageSquare size={12} />
                            <span className="text-[10px] font-bold">{task.comments?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Image size={12} />
                            <span className="text-[10px] font-bold">{task.images?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {filteredTasks.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center opacity-40">
                      <Plus size={24} className="text-slate-300 mb-2" />
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTaskId(null)} 
            isAdmin={isAdmin}
            onUpdate={(updates) => onUpdateTask(selectedTask.id as string, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const colors: any = {
    'Listing To Do': 'bg-orange-50 text-orange-600 border-orange-100',
    'Design To Do': 'bg-yellow-50 text-yellow-600 border-yellow-100',
    'Design Confirm Request': 'bg-purple-50 text-purple-600 border-purple-100',
    'Confirm Request Final': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Confirmed': 'bg-blue-50 text-blue-600 border-blue-100',
    'Listing Completed': 'bg-red-50 text-red-600 border-red-100',
    'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'In Progress': 'bg-blue-50 text-blue-600 border-blue-100',
    'Not Started': 'bg-slate-50 text-slate-500 border-slate-100',
  };

  const dotColors: any = {
    'Listing To Do': 'bg-orange-500',
    'Design To Do': 'bg-yellow-500',
    'Design Confirm Request': 'bg-purple-500',
    'Confirm Request Final': 'bg-emerald-500',
    'Confirmed': 'bg-blue-500',
    'Listing Completed': 'bg-red-500',
    'Completed': 'bg-emerald-500',
    'In Progress': 'bg-blue-500',
    'Not Started': 'bg-slate-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${colors[status] || colors['Not Started']}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status] || dotColors['Not Started']}`}></span>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const colors: any = {
    'High': 'text-orange-600',
    'Medium': 'text-blue-600',
    'Low': 'text-slate-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${colors[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${priority === 'High' ? 'bg-orange-500' : priority === 'Medium' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
      {priority}
    </span>
  );
}

function DashboardView({ tasks, clients, staff, timeEntries }: { 
  tasks: Task[], 
  clients: Client[], 
  staff: StaffMember[],
  timeEntries: TimeEntry[]
}) {
  const activeTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Confirmed');
  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Confirmed');
  const highPriorityTasks = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed');
  
  // Calculate total time today
  const today = new Date().toISOString().split('T')[0];
  const timeToday = timeEntries
    .filter(e => e.date === today)
    .reduce((acc, curr) => acc + curr.duration, 0);
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full custom-scrollbar">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back!</h1>
        <p className="text-slate-500 text-sm mt-1">Here's what's happening in your workspace today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          icon={<CheckSquare className="text-blue-600" size={24} />}
          label="Active Tasks"
          value={activeTasks.length.toString()}
          trend="+2 since yesterday"
          color="blue"
        />
        <StatCard 
          icon={<Clock className="text-amber-600" size={24} />}
          label="Time Today"
          value={formatTime(timeToday)}
          trend="Keep it up!"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* High Priority Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Urgent Tasks</h2>
            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 uppercase tracking-wider">
              {highPriorityTasks.length} High Priority
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {highPriorityTasks.slice(0, 5).map(task => (
                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                      <p className="text-xs text-slate-500">{task.clientName} • Due {task.dueDate}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              ))}
              {highPriorityTasks.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  No high priority tasks. Great job!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: string, trend: string, color: string }) {
  const colors: any = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    purple: 'bg-purple-50 border-purple-100'
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 mb-2">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{trend}</p>
    </div>
  );
}

function PlaceholderView({ title, description }: { title: string, description: string }) {
  return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
        <Smile size={48} />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      <p className="text-slate-500 mt-2 font-medium">{description}</p>
      <button className="mt-8 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
        Get Started
      </button>
    </div>
  );
}

function AddTaskModal({ onClose, onAdd, clients, staff }: { 
  onClose: () => void, 
  onAdd: (task: Omit<Task, 'id'>) => void, 
  clients: Client[],
  staff: StaffMember[]
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<Status>('Listing To Do');
  const [clientId, setClientId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === clientId);
    const assignee = staff.find(s => s.id === assignedTo);
    
    onAdd({
      title,
      status,
      priority,
      dueDate,
      clientId,
      clientName: client?.name || 'No Client',
      assignedTo,
      assignedToName: assignee?.name || 'Unassigned',
      subtasks: { completed: 0, total: 0 },
      images: [],
      comments: []
    });
  };

  const statuses: Status[] = [
    'Listing To Do',
    'Design To Do',
    'Design Confirm Request',
    'Confirm Request Final',
    'Confirmed',
    'Listing Completed'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Task</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Task Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Review Amazon inventory reports"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Client</label>
                <select 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                >
                  <option value="">No Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assignee</label>
                <select 
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Due Date</label>
                <input 
                  type="date" 
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                {(['High', 'Medium', 'Low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      priority === p 
                        ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4 flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function TaskDetailModal({ task, onClose, isAdmin, onUpdate }: { 
  task: Task, 
  onClose: () => void, 
  isAdmin: boolean,
  onUpdate: (updates: Partial<Task>) => Promise<void> | void
}) {
  const { user } = useFirebase();
  const [comment, setComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    console.log("TaskDetailModal: task prop updated:", task);
  }, [task]);

  console.log("TaskDetailModal rendering with images:", task.images?.length || 0);

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      console.log("Attempting to download image:", url);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      console.log("Download successful.");
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleAddComment = () => {
    if (!comment.trim() || !user) return;
    
    const newComment = {
      id: Date.now().toString(),
      userId: user.uid,
      userName: user.displayName || user.email || 'Anonymous',
      text: comment,
      createdAt: new Date().toISOString()
    };

    onUpdate({
      comments: [...(task.comments || []), newComment]
    });
    setComment('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // Deep diagnostic logging
    console.log("Starting image upload diagnostic...");
    console.log("Original file info:", { name: file.name, size: (file.size / 1024).toFixed(2) + " KB", type: file.type });

    if (!user) {
      console.error("User not authenticated! Cannot upload image.");
      alert("Error: You must be logged in to upload images.");
      return;
    }

    if (!task.id) {
      console.error("Task ID is missing! Cannot upload image.");
      alert("Error: Task ID is missing. Please try closing and reopening the task.");
      return;
    }

    if (task.images && task.images.length >= 5) {
      alert("Maximum of 5 images per task reached. Please remove an existing image before adding a new one.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Compress image aggressively if it's large or if Storage is likely unreachable
      // We target a much smaller size (0.3MB) because Base64 adds ~33% overhead
      // and we need to leave room for other task data.
      console.log("Attempting aggressive client-side compression...");
      const options = {
        maxSizeMB: 0.3, // Target ~300KB
        maxWidthOrHeight: 1280, // Reduce resolution for better compression
        useWebWorker: true,
        initialQuality: 0.6 // Lower initial quality
      };
      try {
        const compressedFile = await imageCompression(file, options);
        console.log("Compression successful:", { 
          originalSize: (file.size / 1024).toFixed(2) + " KB", 
          compressedSize: (compressedFile.size / 1024).toFixed(2) + " KB" 
        });
        file = compressedFile;
      } catch (compressionError) {
        console.error("Compression failed, proceeding with original file:", compressionError);
      }

      // Step 2: Diagnostic Connectivity Test (Shortened)
      console.log("Running Storage connectivity test...");
      let isStorageReachable = false;
      try {
        const testRef = ref(storage, 'connectivity-test-' + Date.now());
        await Promise.race([
          getDownloadURL(testRef).catch(() => null),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        isStorageReachable = true;
        console.log("Storage service is reachable.");
      } catch (e) {
        console.warn("Storage service is UNREACHABLE or timed out. Will use Base64 fallback.");
      }

      // Step 3: Attempt Firebase Storage upload if reachable
      if (isStorageReachable) {
        console.log("Attempting Firebase Storage upload...");
        const storagePath = `tasks/${task.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), 30000)
        );

        try {
          const uploadResult = (await Promise.race([
            uploadBytes(storageRef, file),
            timeoutPromise
          ])) as any;
          
          const downloadURL = await getDownloadURL(storageRef);
          await onUpdate({
            images: arrayUnion(downloadURL) as any
          });
          console.log("Task updated with Storage URL.");
          setIsUploading(false);
          return;
        } catch (storageError) {
          console.error("Storage upload failed, falling back to Base64:", storageError);
        }
      }

      // Step 4: Base64 Fallback (for when Storage is unreachable or fails)
      console.log("Using Base64 fallback...");
      if (file.size > 1024 * 1024) {
        alert("Image is still too large (> 1MB) even after compression. Please try a smaller image.");
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const base64String = await base64Promise;
      await onUpdate({
        images: arrayUnion(base64String) as any
      });
      console.log("Task updated with Base64 image.");
      if (!isStorageReachable) {
        console.info("Note: Image saved to database because Storage service is unreachable in this environment.");
      }
    } catch (error: any) {
      console.error("Final upload error:", error);
      let errorMessage = "Upload failed. Please try again.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error && parsed.error.includes('exceeds the maximum allowed size')) {
          errorMessage = "The image is still too large for the database. Please try a smaller image or a different file type.";
        } else {
          errorMessage = parsed.error || errorMessage;
        }
      } catch (e) {
        errorMessage = error.message || errorMessage;
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const imageUrl = task.images?.[index];
    if (!imageUrl) return;
    
    onUpdate({ 
      images: arrayRemove(imageUrl) as any 
    });
  };

  const removeComment = (commentId: string) => {
    onUpdate({
      comments: (task.comments || []).filter(c => c.id !== commentId)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">{task.title}</h2>
                <div className="flex items-center gap-6 text-slate-500 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-blue-500" />
                    <span>{task.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" />
                    <span>Due {task.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCircle size={16} className="text-blue-500" />
                    <span>{task.assignedToName}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Image size={20} className="text-blue-600" />
                    Task Images
                  </h3>
                  <label className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                    {isUploading ? <Clock className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isUploading ? `Uploading ${uploadProgress}%...` : 'Add Image'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {task.images?.map((img, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={img} alt={`Task ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleDownloadImage(img, `task-image-${idx}.png`)}
                          className="p-2 bg-white/20 hover:bg-blue-500 text-white rounded-full backdrop-blur-md transition-all"
                          title="Download Image"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => removeImage(idx)}
                          className="p-2 bg-white/20 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all"
                          title="Delete Image"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!task.images || task.images.length === 0) && (
                    <div className="col-span-full py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <Image size={32} className="mb-2 opacity-20" />
                      <span className="text-sm font-bold opacity-40">No images uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare size={20} className="text-blue-600" />
                  Comments
                </h3>
                
                <div className="space-y-4">
                  {task.comments?.map((c) => (
                    <div key={c.id} className="bg-slate-50 p-4 rounded-2xl relative group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {c.userName.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-900">{c.userName}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {(isAdmin || c.userId === user?.uid) && (
                          <button 
                            onClick={() => removeComment(c.id)}
                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                  {(!task.comments || task.comments.length === 0) && (
                    <div className="py-8 text-center text-slate-400 italic text-sm">
                      No comments yet. Be the first to start the conversation!
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <div className="relative">
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm min-h-[100px] resize-none"
                    />
                    <button 
                      onClick={handleAddComment}
                      disabled={!comment.trim()}
                      className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl space-y-6">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Task Details</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                    <select 
                      value={task.status}
                      onChange={(e) => onUpdate({ status: e.target.value as Status })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    >
                      {[
                        'Listing To Do',
                        'Design To Do',
                        'Design Confirm Request',
                        'Confirm Request Final',
                        'Confirmed',
                        'Listing Completed'
                      ].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                    <select 
                      value={task.priority}
                      onChange={(e) => onUpdate({ priority: e.target.value as Priority })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                    >
                      {['High', 'Medium', 'Low'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assignee</label>
                    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600">
                        {task.assignedToName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{task.assignedToName}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-600 p-6 rounded-3xl text-white">
                <h4 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-80">Quick Actions</h4>
                <div className="space-y-3">
                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <Paperclip size={16} />
                    Attach SOP
                  </button>
                  <button className="w-full py-3 bg-white text-blue-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <CheckSquare size={16} />
                    Mark as Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SettingsView() {
  const settingsCards = [
    {
      title: 'Notifications',
      description: 'Control in-app and email notification preferences',
      icon: <Bell className="text-blue-600" size={20} />,
    },
    {
      title: 'SOP Templates',
      description: 'Manage standard operating procedure templates',
      icon: <FileText className="text-blue-600" size={20} />,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your Portal preferences and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card, index) => (
          <div 
            key={index} 
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              {card.icon}
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{card.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffView({ staff, onInvite, setConfirmModal, setAlertModal }: { 
  staff: StaffMember[], 
  onInvite: () => void,
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>,
  setAlertModal: React.Dispatch<React.SetStateAction<any>>
}) {
  const { user: currentUser, isAdmin: contextIsAdmin } = useFirebase();
  const isAdmin = contextIsAdmin || currentUser?.email?.toLowerCase() === ADMIN_EMAIL;

  const handleDeleteStaff = async (staffId: string) => {
    if (staffId === currentUser?.uid) {
      setAlertModal({
        isOpen: true,
        title: 'Action Not Allowed',
        message: 'You cannot delete yourself.'
      });
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Staff Member',
      message: 'Are you sure you want to delete this staff member? They will lose all access to the portal.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', staffId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${staffId}`);
        }
      }
    });
  };

  const handleUpdateRole = async (staffId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', staffId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${staffId}`);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage team members, roles, and permissions</p>
        </div>
        <button 
          onClick={onInvite}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} />
          Invite Staff
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[140px]">
            <option>All Roles</option>
            <option>Admin</option>
            <option>Editor</option>
            <option>Viewer</option>
          </select>
          <select className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 min-w-[140px]">
            <option>All Status</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invited</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((member, index) => (
              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5 text-sm text-slate-400 font-medium">{index + 1}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <img src={member.avatar} alt={member.name} referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{member.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-500 font-medium">{member.email}</td>
                <td className="px-6 py-5 text-sm text-slate-500 font-bold">{member.designation || '-'}</td>
                <td className="px-6 py-5">
                  {isAdmin ? (
                    <select 
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id as string, e.target.value)}
                      className="bg-purple-50 text-purple-600 text-[10px] font-bold border border-purple-100 uppercase tracking-wider rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300 cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-[10px] font-bold border border-purple-100 uppercase tracking-wider">
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${
                    member.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                    member.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-slate-400 font-medium">{member.invitedDate}</td>
                <td className="px-6 py-5 text-center">
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteStaff(member.id as any)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InviteStaffModal({ onClose, onInvite }: { onClose: () => void, onInvite: (member: any) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite({ name, email, role, designation });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Invite Team Member</h2>
              <p className="text-slate-500 text-sm">Send an invitation to join JY Factory</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@jyfactory.ca"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Designation</label>
              <input 
                type="text" 
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g., Amazon Account Manager"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="pt-4 flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function ClientsView({ clients, onAddClient, setConfirmModal, setAlertModal }: { 
  clients: Client[], 
  onAddClient: () => void,
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>,
  setAlertModal: React.Dispatch<React.SetStateAction<any>>
}) {
  const { user, isAdmin: contextIsAdmin } = useFirebase();
  const isAdmin = contextIsAdmin || user?.email?.toLowerCase() === ADMIN_EMAIL;

  const handleDeleteClient = async (clientId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? All associated projects might be affected.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'clients', clientId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `clients/${clientId}`);
        }
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clients</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your client database and contact information</p>
        </div>
        {isAdmin && (
          <button 
            onClick={onAddClient}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus size={18} />
            Add Client
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <motion.div 
            key={client.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">
                {client.name.charAt(0)}
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteClient(client.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all font-bold text-xs border border-red-100"
                >
                  <X size={14} />
                  Delete
                </button>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{client.name}</h3>
            
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Briefcase size={14} className="text-slate-400" />
                {client.projects || 0} Active Projects
              </div>
            </div>
          </motion.div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Briefcase className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No clients found. Add your first client to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddClientModal({ onClose, onAdd }: { onClose: () => void, onAdd: (client: Omit<Client, 'id'>) => void }) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, projects: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Add New Client</h2>
              <p className="text-slate-500 text-sm">Create a new client profile</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Client Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="pt-4 flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Create Client
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmationModal({ title, message, onConfirm, onClose }: { title: string, message: string, onConfirm: () => void, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-500 text-sm mb-8">{message}</p>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AlertModal({ title, message, onClose }: { title: string, message: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Bell size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-500 text-sm mb-8">{message}</p>
          
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TimeTrackerView({ 
  activeTimer, 
  setActiveTimer, 
  clients, 
  tasks, 
  user 
}: { 
  activeTimer: any, 
  setActiveTimer: any, 
  clients: Client[], 
  tasks: Task[],
  user: any
}) {
  const [clientId, setClientId] = useState(activeTimer?.clientId || '');
  const [taskId, setTaskId] = useState(activeTimer?.taskId || '');
  const [description, setDescription] = useState(activeTimer?.description || '');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      const start = new Date(activeTimer.startTime).getTime();
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const client = clients.find(c => c.id === clientId);
    const task = tasks.find(t => t.id === taskId);
    
    if (!clientId) {
      alert('Please select a client');
      return;
    }

    const newTimer = {
      startTime: new Date().toISOString(),
      clientId,
      clientName: client?.name || 'Unknown',
      taskId,
      taskTitle: task?.title || '',
      description
    };
    setActiveTimer(newTimer);
  };

  const handleStop = async () => {
    if (!activeTimer) return;

    const endTime = new Date().toISOString();
    const duration = Math.floor((new Date(endTime).getTime() - new Date(activeTimer.startTime).getTime()) / 1000);

    const timeEntry: Omit<TimeEntry, 'id'> = {
      userId: user.uid,
      userName: user.displayName || 'User',
      clientId: activeTimer.clientId,
      clientName: activeTimer.clientName,
      taskId: activeTimer.taskId,
      taskTitle: activeTimer.taskTitle,
      startTime: activeTimer.startTime,
      endTime,
      duration,
      description: activeTimer.description,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      await addDoc(collection(db, 'timeEntries'), timeEntry);
      setActiveTimer(null);
      setClientId('');
      setTaskId('');
      setDescription('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'timeEntries');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Time Tracker</h1>
        <p className="text-slate-500">Track your daily work hours for client billing.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Client</label>
              <select 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={!!activeTimer}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
              >
                <option value="">Select a client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Task (Optional)</label>
              <select 
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!!activeTimer}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
              >
                <option value="">Select a task</option>
                {tasks.filter(t => t.clientId === clientId).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-700 mb-2">What are you working on?</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!activeTimer}
              placeholder="Describe your work..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-24 resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="text-6xl font-mono font-bold text-slate-800 mb-8 tracking-tighter">
              {formatTime(elapsed)}
            </div>
            
            {!activeTimer ? (
              <button 
                onClick={handleStart}
                className="flex items-center gap-3 px-12 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 group"
              >
                <Play size={24} className="fill-current" />
                Start Timer
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="flex items-center gap-3 px-12 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 group"
              >
                <Square size={24} className="fill-current" />
                Stop Timer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimesheetsView({ 
  timeEntries, 
  isAdmin 
}: { 
  timeEntries: TimeEntry[], 
  isAdmin: boolean 
}) {
  const [filter, setFilter] = useState('');
  
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const filteredEntries = timeEntries.filter(entry => 
    entry.clientName.toLowerCase().includes(filter.toLowerCase()) ||
    entry.userName.toLowerCase().includes(filter.toLowerCase()) ||
    entry.description.toLowerCase().includes(filter.toLowerCase())
  );

  const handleExport = () => {
    const headers = ['Date', 'User', 'Client', 'Task', 'Description', 'Start Time', 'End Time', 'Duration (s)', 'Duration (h)'];
    const rows = filteredEntries.map(e => [
      e.date,
      e.userName,
      e.clientName,
      e.taskTitle || '',
      e.description,
      e.startTime,
      e.endTime || '',
      e.duration,
      (e.duration / 3600).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Timesheets</h1>
          <p className="text-slate-500">View and export work logs for billing.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by client, user, or description..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{entry.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${entry.userName}/50/50`} alt={entry.userName} />
                      </div>
                      <span className="text-sm font-bold text-slate-800">{entry.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">{entry.clientName}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 line-clamp-1">{entry.description}</p>
                    {entry.taskTitle && <p className="text-[10px] text-slate-400 font-bold uppercase">{entry.taskTitle}</p>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                      {formatDuration(entry.duration)}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Clock className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-medium">No time entries found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MyProfileModal({ onClose, staffMember }: { onClose: () => void, staffMember?: StaffMember }) {
  const { user } = useFirebase();
  const [name, setName] = useState(staffMember?.name || user?.displayName || '');
  const [designation, setDesignation] = useState(staffMember?.designation || '');
  const [avatar, setAvatar] = useState(staffMember?.avatar || user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setAvatar(base64data);
        setIsUploading(false);
      };
    } catch (error) {
      console.error("Image compression failed:", error);
      setIsUploading(false);
      alert("Failed to process image. Please try a smaller file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      console.log("Updating profile for user:", user.uid, { name, designation, status: 'Active' });
      await updateDoc(userDocRef, {
        name,
        designation,
        avatar,
        status: 'Active'
      });
      console.log("Profile updated successfully");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserCircle size={48} className="text-slate-300" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all">
                  <Camera size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Profile Picture</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Designation</label>
                <input 
                  type="text" 
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g., Amazon Account Manager"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving || isUploading}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

