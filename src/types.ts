export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'Completed' | 'In Progress' | 'Not Started';

export interface Task {
  id: number;
  title: string;
  project?: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  subtasks: { completed: number; total: number };
}

export interface Client {
  id: string;
  name: string;
  industry?: string;
  projects?: number;
  email?: string;
  phone?: string;
  website?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName?: string;
  status: 'Active' | 'On Hold' | 'Completed';
  budget?: number;
  deadline?: string;
  description?: string;
}

export interface StaffMember {
  id: string | number;
  name: string;
  role: string;
  email: string;
  avatar: string;
  status: 'Active' | 'Pending' | 'Inactive';
  invitedDate: string;
  hasPassword?: boolean;
}

export type ViewType = 'Dashboard' | 'My Tasks' | 'Clients' | 'Projects' | 'All Tasks' | 'Studio' | 'Staff' | 'AI Agents' | 'Settings';
