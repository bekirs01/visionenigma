export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Ticket {
  id: number;
  sender_email: string;
  sender_name?: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  category_id?: number;
  source: string;
  external_id?: string;
  received_at?: string;
  created_at?: string;
  updated_at?: string;
  ai_category?: string;
  ai_reply?: string;
  reply_sent?: boolean | number;
  sent_reply?: string;
  reply_sent_at?: string;
}

export interface TicketCreate {
  sender_email: string;
  sender_name?: string;
  subject: string;
  body: string;
  status?: string;
  priority?: string;
  category_id?: number;
  source?: string;
  client_token?: string;
}

export interface TicketUpdate {
  status?: string;
  priority?: string;
  category_id?: number;
  subject?: string;
  body?: string;
}

export interface AnalyzeResponse {
  predicted_category: string;
  confidence: number;
  provider: string;
  model_version: string;
  analysis_id: number;
}

export interface SuggestReplyResponse {
  suggested_reply: string;
  provider: string;
  model_version: string;
  analysis_id: number;
}
