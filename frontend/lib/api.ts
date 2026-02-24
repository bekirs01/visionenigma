const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

export const api = {
  health: () => fetchApi<{ status: string }>("/health"),

  getCategories: () => fetchApi<import("@/app/types").Category[]>("/api/categories"),

  getTickets: (params?: { search?: string; status?: string; category_id?: number; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    const q = sp.toString();
    return fetchApi<import("@/app/types").Ticket[]>(`/api/tickets${q ? `?${q}` : ""}`);
  },

  getTicket: (id: number) => fetchApi<import("@/app/types").Ticket>(`/api/tickets/${id}`),

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

  seedDemo: () => fetchApi<{ message: string }>("/api/seed-demo", { method: "POST" }),

  exportCsvUrl: (params?: { search?: string; status?: string; category_id?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.category_id != null) sp.set("category_id", String(params.category_id));
    const q = sp.toString();
    return `${API_BASE}/api/tickets/export.csv${q ? `?${q}` : ""}`;
  },
};
