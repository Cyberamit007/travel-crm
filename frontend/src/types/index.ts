export type Role = 'ADMIN' | 'EMPLOYEE';
export type LeadSource = 'WHATSAPP' | 'INSTAGRAM' | 'MANUAL' | 'WEBSITE';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'FOLLOW_UP_SCHEDULED' | 'CONFIRMED' | 'LOST';
export type LeadPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT' | 'ENDED';
export type NotificationType = 'FOLLOW_UP_DUE' | 'FOLLOW_UP_OVERDUE' | 'NEW_LEAD_ASSIGNED' | 'LEAD_STATUS_CHANGED' | 'CAMPAIGN_UPDATE' | 'SYSTEM';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Department {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  description?: string;
  headId?: string;
  head?: { id: string; name: string };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: { employees: number; designations: number };
}

export interface Designation {
  id: string;
  departmentId: string;
  department?: { id: string; name: string; code: string };
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: { employees: number };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  availability: AvailabilityStatus;
  lastLogin?: string;
  createdAt: string;
  employeeId?: string;
  departmentId?: string;
  department?: { id: string; name: string; code: string };
  designationId?: string;
  designation?: { id: string; name: string };
  _count?: { assignedLeads: number };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  organizationId?: string;
  _count?: { leads: number };
  createdAt: string;
}

export interface LeadTag {
  id: string;
  leadId: string;
  tagId: string;
  tag: Tag;
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
  isFromMeta?: boolean;
  metaCampaignId?: string;
  archivedAt?: string;
  archiveS3Key?: string;
}

export interface CampaignEmployee {
  id: string;
  campaignId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
  assignedAt: string;
}

export interface CampaignNote {
  id: string;
  content: string;
  isEdited: boolean;
  campaignId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'avatar' | 'role'>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  campaignId: string;
  uploadedById: string;
  uploadedBy: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  message?: string;
  destination?: string;
  campaignId?: string;
  campaign?: Pick<Campaign, 'id' | 'name' | 'destination'>;
  assignedToId?: string;
  assignedTo?: Pick<User, 'id' | 'name' | 'email'>;
  lostReason?: string;
  lostReasonOther?: string;
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
  tags?: LeadTag[];
  activityLogs?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadComment {
  id: string;
  content: string;
  isEdited: boolean;
  leadId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'avatar' | 'role'>;
  parentId?: string;
  replies?: LeadComment[];
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
  entityType?: string;
  entityId?: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatar' | 'role'>;
  leadId?: string;
  lead?: Pick<Lead, 'id' | 'name'>;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  adminNote?: string;
  employeeId: string;
  employee: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
  approvedById?: string;
  approvedBy?: Pick<User, 'id' | 'name'>;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  availability: AvailabilityStatus;
  lastLogin?: string;
  createdAt: string;
  stats: {
    total: number;
    confirmed: number;
    lost: number;
    pending: number;
    overdue: number;
    conversionRate: string;
  };
  campaignAssignments: Array<{
    id: string;
    campaign: Pick<Campaign, 'id' | 'name' | 'destination' | 'status'>;
  }>;
  activityLogs: ActivityLog[];
}

export interface OrgSettings {
  sources: string[];
  destinations: string[];
  lostReasons: string[];
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyWebsite: string;
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
  pending: number;
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
