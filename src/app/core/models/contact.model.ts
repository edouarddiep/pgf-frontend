export interface ContactMessage {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead?: boolean;
  status?: MessageStatus;
  createdAt?: string;
  updatedAt?: string;
}

export enum MessageStatus {
  NEW = 'NEW',
  READ = 'read',
  REPLIED = 'REPLIED',
  ARCHIVED = 'ARCHIVED'
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}
