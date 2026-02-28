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
  completed_at?: string;  // Время завершения (для автоудаления через 5 мин)

  // ЭРИС: извлечённые данные из писем
  sender_full_name?: string;      // ФИО отправителя
  object_name?: string;           // Название предприятия/объекта
  sender_phone?: string;          // Контактный телефон
  serial_numbers?: string[];      // Заводские номера приборов
  device_type?: string;           // Модель или тип устройства
  sentiment?: 'positive' | 'neutral' | 'negative';  // Эмоциональный окрас
  issue_summary?: string;         // Краткое описание проблемы
  request_category?: string;      // Классификация запроса

  operator_required?: boolean;
  operator_reason?: string | null;
  device_info?: string | null;
  ai_status?: string | null;   // pending | done | failed
  ai_error?: string | null;     // failed ise kısa hata
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
  sender_full_name?: string;
  sender_phone?: string;
  object_name?: string;
  device_info?: string;
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

export interface TicketAttachmentRead {
  id: number;
  ticket_id: number;
  filename: string;
  mime_type: string;
  size_bytes?: number | null;
  storage_path: string;
  created_at?: string | null;
  download_url?: string | null;
}
