import { Request } from 'express';

export type Role = 'ADMIN' | 'EMPLOYEE';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface WebhookWhatsAppEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: { body: string };
        type: string;
      }>;
    };
    field: string;
  }>;
}

export interface WebhookInstagramEntry {
  id: string;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: { mid: string; text: string };
  }>;
  leadgen?: Array<{
    leadgen_id: string;
    page_id: string;
    form_id: string;
    ad_id: string;
    ad_name: string;
    created_time: number;
  }>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
