"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Ticket, Category, TicketCreate } from "./types";

export default function HomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TicketCreate>({
    sender_email: "",
    subject: "",
    body: "",
    status: "new",
    priority: "medium",
    source: "manual",
  });
  const [submitting, setSubmitting] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets({
        search: search || undefined,
        status: statusFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        limit: 100,
      });
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createTicket(form);
      setForm({ sender_email: "", subject: "", body: "", status: "new", priority: "medium", source: "manual" });
      setFormOpen(false);
      loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    setError(null);
    try {
      await api.seedDemo();
      loadTickets();
      loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка seed");
    } finally {
      setSeedLoading(false);
    }
  };

  const exportCsv = () => {
    const url = api.exportCsvUrl({
      search: search || undefined,
      status: statusFilter || undefined,
      category_id: categoryFilter ? Number(categoryFilter) : undefined,
    });
    window.open(url, "_blank");
  };

  const categoryName = (id: number | undefined) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <h1>Обращения техподдержки</h1>

      <div className="card flex" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Поиск (тема, email, текст)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">Все статусы</option>
          <option value="new">Новый</option>
          <option value="in_progress">В работе</option>
          <option value="answered">Отвечен</option>
          <option value="closed">Закрыт</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={loadTickets}>Обновить</button>
        <button type="button" className="primary" onClick={() => setFormOpen(!formOpen)}>
          + Добавить обращение
        </button>
        <button type="button" onClick={exportCsv}>Экспорт CSV</button>
        <button type="button" onClick={handleSeed} disabled={seedLoading}>
          {seedLoading ? "Загрузка…" : "Seed демо"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {formOpen && (
        <div className="card mt-2">
          <h2 style={{ marginBottom: "1rem" }}>Новое обращение</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Email отправителя</label>
              <input
                type="email"
                required
                value={form.sender_email}
                onChange={(e) => setForm((f) => ({ ...f, sender_email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Тема</label>
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Текст</label>
              <textarea
                required
                rows={3}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Приоритет</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
            <div className="flex mt-2">
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? "Сохранение…" : "Создать"}
              </button>
              <button type="button" onClick={() => setFormOpen(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <p className="loading">Загрузка списка…</p>
        ) : tickets.length === 0 ? (
          <p className="loading">Нет обращений. Добавьте вручную или нажмите «Seed демо».</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Тема</th>
                <th>Отправитель</th>
                <th>Статус</th>
                <th>Категория</th>
                <th>Приоритет</th>
                <th>Создан</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.subject}</td>
                  <td>{t.sender_email}</td>
                  <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                  <td>{categoryName(t.category_id)}</td>
                  <td>{t.priority}</td>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleString("ru") : "—"}</td>
                  <td><Link href={`/tickets/${t.id}`}>Открыть</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
