export type Role = 'ADMIN' | 'EMPLOYEE';
export type LeadSource = 'WHATSAPP' | 'INSTAGRAM' | 'MANUAL' | 'WEBSITE';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'FOLLOW_UP_SCHEDULED' | 'CONFIRMED' | 'LOST';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
export type NotificationType = 'FOLLOW_UP_DUE' | 'FOLLOW_UP_OVERDUE' | 'NEW_LEAD_ASSIGNED' | 'LEAD_STATUS_CHANGED' | 'CAMPAIGN_UPDATE' | 'SYSTEM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { assignedLeads: number };
}

export interface Campaign {
  id: string;
  name: string;
  destination: string;
  description?: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  targetLeads?: number;
  budget?: number;
  whatsappNumber?: string;
  instagramAdId?: string;
  utmSource?: string;
  utmCampaign?: string;
  keywords: string[];
  employees: CampaignEmployee[];
  _count?: { leads: number };
  createdAt: string;
  updatedAt: string;
}

export interface CampaignEmployee {
  id: string;
  campaignId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
  assignedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  message?: string;
  destination?: string;
  campaignId?: string;
  campaign?: Pick<Campaign, 'id' | 'name' | 'destination'>;
  assignedToId?: string;
  assignedTo?: Pick<User, 'id' | 'name' | 'email'>;
  followUpDate?: string;
  followUpNotes?: string;
  followUpDone: boolean;
  notes?: string;
  budget?: number;
  groupSize?: number;
  preferredDate?: string;
  isRead: boolean;
  whatsappMsgId?: string;
  instagramLeadId?: string;
  adName?: string;
  activityLogs?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  leadId?: string;
  lead?: Pick<Lead, 'id' | 'name'>;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  userId: string;
  user: Pick<User, 'id' | 'name'>;
  leadId?: string;
  createdAt: string;
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  overdue: number;
}

export interface EmployeePerformance {
  id: string;
  name: string;
  email: string;
  total: number;
  confirmed: number;
  lost: number;
  active: number;
  overdue: number;
  conversionRate: string;
}

export interface CampaignStat {
  id: string;
  name: string;
  destination: string;
  status: CampaignStatus;
  total: number;
  confirmed: number;
  lost: number;
  active: number;
  conversionRate: string;
  targetLeads?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount?: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type FeedbackType = 'BUG' | 'SUGGESTION' | 'OTHER';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Feedback {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  page?: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  adminNotes?: string;
  submittedById: string;
  submittedBy: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackStats {
  total: number;
  open: number;
  inProgress: number;
  bugs: number;
  suggestions: number;
}
