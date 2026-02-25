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

  // ЭРИС: извлечённые данные из писем
  sender_full_name?: string;      // ФИО отправителя
  object_name?: string;           // Название предприятия/объекта
  sender_phone?: string;          // Контактный телефон
  serial_numbers?: string[];      // Заводские номера приборов
  device_type?: string;           // Модель или тип устройства
  sentiment?: 'positive' | 'neutral' | 'negative';  // Эмоциональный окрас
  issue_summary?: string;         // Краткое описание проблемы
  request_category?: string;      // Классификация запроса
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
