// Empty = use Next.js rewrites (same domain, no CORS/cookie issues)
const API_BASE = "";

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bağlantı hatası";
    if (msg === "Failed to fetch" || msg.includes("fetch"))
      throw new Error("Sunucuya bağlanılamadı. Backend çalışıyor mu? (http://localhost:8000)");
    throw new Error(msg);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type");
  const text = await res.text();
  if (!text || text.trim() === "") return undefined as unknown as T;
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as unknown as T;
    }
  }
  return text as unknown as T;
}

export const api = {
  health: () => fetchApi<{ status: string }>("/health"),

  getCategories: () => fetchApi<import("@/app/types").Category[]>("/api/categories"),

  getTickets: (params?: { search?: string; status?: string; category_id?: number; request_category?: string; view?: "open" | "answered"; limit?: number; offset?: number }, clientToken?: string) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    if (params?.request_category) sp.set("request_category", params.request_category);
    if (params?.view) sp.set("view", params.view);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    if (clientToken) sp.set("client_token", clientToken);
    const q = sp.toString();
    return fetchApi<{ items: import("@/app/types").Ticket[]; total: number }>(`/api/tickets${q ? `?${q}` : ""}`);
  },

  getTicket: (id: number, clientToken?: string) => {
    const sp = new URLSearchParams();
    if (clientToken) sp.set("client_token", clientToken);
    const q = sp.toString();
    return fetchApi<import("@/app/types").Ticket>(`/api/tickets/${id}${q ? `?${q}` : ""}`);
  },

  /** Вложения тикета (email attachments). */
  getTicketAttachments: (ticketId: number, clientToken?: string) => {
    const sp = new URLSearchParams();
    if (clientToken) sp.set("client_token", clientToken);
    const q = sp.toString();
    return fetchApi<import("@/app/types").TicketAttachmentRead[]>(`/api/tickets/${ticketId}/attachments${q ? `?${q}` : ""}`);
  },

  deleteTicket: (id: number, clientToken?: string) => {
    const sp = new URLSearchParams();
    if (clientToken) sp.set("client_token", clientToken);
    const q = sp.toString();
    return fetchApi<{ ok?: boolean } | undefined>(`/api/tickets/${id}${q ? `?${q}` : ""}`, { method: "DELETE" });
  },

  createTicket: (data: import("@/app/types").TicketCreate) =>
    fetchApi<import("@/app/types").Ticket>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTicket: (id: number, data: import("@/app/types").TicketUpdate) =>
    fetchApi<import("@/app/types").Ticket>(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  analyzeTicket: (id: number) =>
    fetchApi<import("@/app/types").AnalyzeResponse>(`/api/tickets/${id}/analyze`, { method: "POST" }),

  suggestReply: (id: number) =>
    fetchApi<import("@/app/types").SuggestReplyResponse>(`/api/tickets/${id}/suggest-reply`, { method: "POST" }),

  /** Gerçek AI: OpenAI ile analiz (kategori + cevap), ticket.ai_category ve ai_reply güncellenir */
  aiAnalyze: (ticketId: number) =>
    fetchApi<{ ai_category: string; ai_reply: string }>(`/api/ai/analyze/${ticketId}`, { method: "POST" }),

  /** Cevabı gönderildi olarak işaretle */
  aiSendReply: (ticketId: number, replyText: string) =>
    fetchApi<{ ok: boolean }>(`/api/ai/send-reply/${ticketId}`, {
      method: "POST",
      body: JSON.stringify({ reply_text: replyText }),
    }),

  /** Проверка админа (cookie). 200 = ок, 403 = не админ */
  adminCheck: () => fetchApi<{ ok: boolean }>("/api/admin/check"),
  adminLogin: (code: string) =>
    fetchApi<{ ok: boolean }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    }),

  adminLogout: () =>
    fetchApi<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),

  seedDemo: () => fetchApi<{ message: string }>("/api/seed-demo", { method: "POST" }),

  /** IMAP INBOX senkronizasyonu (admin). Yeni e-postalar DB'ye eklenir. */
  syncInbox: () =>
    fetchApi<{
      status: string;
      processed: number;
      inserted: number;
      skipped: number;
      results?: unknown[];
    }>("/api/email/fetch", { method: "POST" }),

  /** CSV export: fetch with credentials, then download as blob */
  async exportCsvDownload(params?: { search?: string; status?: string; category_id?: number; request_category?: string; view?: "open" | "answered" }): Promise<void> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    if (params?.request_category) sp.set("request_category", params.request_category);
    if (params?.view) sp.set("view", params.view);
    const q = sp.toString();
    const url = `${API_BASE}/api/tickets/export.csv${q ? `?${q}` : ""}`;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },

  exportCsvUrl: (params?: { search?: string; status?: string; category_id?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    const q = sp.toString();
    return `${API_BASE}/api/tickets/export.csv${q ? `?${q}` : ""}`;
  },

  /** XLSX export: fetch with credentials, then download as blob. Filtreler listeyle aynı (view=open varsayılan). */
  async exportXlsxDownload(params?: { search?: string; status?: string; category_id?: number; request_category?: string; view?: "open" | "answered" }): Promise<void> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    if (params?.request_category) sp.set("request_category", params.request_category);
    if (params?.view) sp.set("view", params.view);
    const q = sp.toString();
    const url = `${API_BASE}/api/tickets/export.xlsx${q ? `?${q}` : ""}`;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tickets-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },

  // Analytics API
  analyticsGetSummary: () =>
    fetchApi<{
      total_tickets: number;
      completed: number;
      not_completed: number;
      operator_required: number;
      avg_response_hours: number | null;
      today_tickets: number;
      week_tickets: number;
    }>("/api/analytics/summary"),

  analyticsGetByCategory: () =>
    fetchApi<Array<{ category: string; count: number; percentage: number }>>("/api/analytics/by-category"),

  analyticsGetBySentiment: () =>
    fetchApi<Array<{ sentiment: string; count: number; percentage: number }>>("/api/analytics/by-sentiment"),

  analyticsGetBySource: () =>
    fetchApi<Array<{ source: string; count: number; percentage: number }>>("/api/analytics/by-source"),

  analyticsGetTimeline: (days?: number) => {
    const sp = new URLSearchParams();
    if (days) sp.set("days", String(days));
    const q = sp.toString();
    return fetchApi<Array<{ date: string; count: number }>>(`/api/analytics/timeline${q ? `?${q}` : ""}`);
  },

  analyticsGetByDeviceType: () =>
    fetchApi<Array<{ device_type: string; count: number; percentage: number }>>("/api/analytics/by-device-type"),

  analyticsGetOperatorStats: () =>
    fetchApi<{
      total_tickets: number;
      requires_operator: number;
      percentage: number;
      by_reason: Array<{ reason: string; count: number }>;
    }>("/api/analytics/operator-stats"),
};
