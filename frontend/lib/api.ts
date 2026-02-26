// Proxy kullanıyorsak (next.config rewrites) boş = same-origin. Yoksa NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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
  if (!text || text.trim() === "") return undefined as Promise<T>;
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(text) as Promise<T>;
    } catch {
      return undefined as Promise<T>;
    }
  }
  return text as Promise<T>;
}

export const api = {
  health: () => fetchApi<{ status: string }>("/health"),

  getCategories: () => fetchApi<import("@/app/types").Category[]>("/api/categories"),

  getTickets: (params?: { search?: string; status?: string; category_id?: number; request_category?: string; limit?: number; offset?: number }, clientToken?: string) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    if (params?.request_category) sp.set("request_category", params.request_category);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    if (clientToken) sp.set("client_token", clientToken);
    const q = sp.toString();
    return fetchApi<import("@/app/types").Ticket[]>(`/api/tickets${q ? `?${q}` : ""}`);
  },

  getTicket: (id: number, clientToken?: string) => {
    const sp = new URLSearchParams();
    if (clientToken) sp.set("client_token", clientToken);
    const q = sp.toString();
    return fetchApi<import("@/app/types").Ticket>(`/api/tickets/${id}${q ? `?${q}` : ""}`);
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

  /** CSV export: fetch with credentials, then download as blob */
  async exportCsvDownload(params?: { search?: string; status?: string; category_id?: number }): Promise<void> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    const q = sp.toString();
    const url = `${API_BASE}/api/tickets/export.csv${q ? `?${q}` : ""}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tickets.csv";
    a.click();
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
};
