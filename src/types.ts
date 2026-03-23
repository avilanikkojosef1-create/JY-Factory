export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 
  | 'Listing To Do' 
  | 'Design To Do' 
  | 'Design Confirm Request' 
  | 'Confirm Request Final' 
  | 'Confirmed' 
  | 'Listing Completed'
  | 'Completed' 
  | 'In Progress' 
  | 'Not Started';

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string | number;
  title: string;
  clientId?: string;
  clientName?: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  subtasks: { completed: number; total: number };
  assignedTo?: string;
  assignedToName?: string;
  createdAt?: string;
  images?: string[];
  comments?: TaskComment[];
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

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  clientId: string;
  clientName: string;
  taskId?: string;
  taskTitle?: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  description: string;
  date: string;
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

export type ViewType = 'Dashboard' | 'My Tasks' | 'Clients' | 'All Tasks' | 'Time Tracker' | 'Timesheets' | 'Studio' | 'Staff' | 'AI Agents' | 'Settings';
