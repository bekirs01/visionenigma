"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Ticket, Category, TicketUpdate, AnalyzeResponse, SuggestReplyResponse } from "@/app/types";

export default function TicketDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState<TicketUpdate>({});
  const [saving, setSaving] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [suggestResult, setSuggestResult] = useState<SuggestReplyResponse | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTicket(id);
      setTicket(data);
      setUpdateForm({ status: data.status, priority: data.priority, category_id: data.category_id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    loadTicket();
  }, [loadTicket]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateTicket(id, updateForm);
      setTicket(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzeLoading(true);
    setAnalyzeResult(null);
    setError(null);
    try {
      const res = await api.analyzeTicket(id);
      setAnalyzeResult(res);
      loadTicket();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка анализа");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!id) return;
    setSuggestLoading(true);
    setSuggestResult(null);
    setError(null);
    try {
      const res = await api.suggestReply(id);
      setSuggestResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подсказки ответа");
    } finally {
      setSuggestLoading(false);
    }
  };

  const categoryName = (cid: number | undefined) => categories.find((c) => c.id === cid)?.name ?? "—";

  if (loading) return <p className="loading">Загрузка…</p>;
  if (!ticket) return <p className="error">{error || "Обращение не найдено"}</p>;

  return (
    <div>
      <div className="flex" style={{ marginBottom: "1rem" }}>
        <Link href="/">← К списку</Link>
      </div>

      <h1>Обращение #{ticket.id}</h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <p><strong>Тема:</strong> {ticket.subject}</p>
        <p><strong>От:</strong> {ticket.sender_email}</p>
        <p><strong>Текст:</strong></p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "0.75rem", borderRadius: 6 }}>{ticket.body}</pre>
        <p><strong>Статус:</strong> <span className={`badge ${ticket.status}`}>{ticket.status}</span></p>
        <p><strong>Приоритет:</strong> {ticket.priority}</p>
        <p><strong>Категория:</strong> {categoryName(ticket.category_id)}</p>
        <p><strong>Создан:</strong> {ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}</p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>Изменить статус / категорию</h2>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label>Статус</label>
            <select
              value={updateForm.status ?? ticket.status}
              onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="new">Новый</option>
              <option value="in_progress">В работе</option>
              <option value="answered">Отвечен</option>
              <option value="closed">Закрыт</option>
            </select>
          </div>
          <div className="form-group">
            <label>Приоритет</label>
            <select
              value={updateForm.priority ?? ticket.priority}
              onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <div className="form-group">
            <label>Категория</label>
            <select
              value={updateForm.category_id ?? ticket.category_id ?? ""}
              onChange={(e) => setUpdateForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="primary" disabled={saving}>{saving ? "Сохранение…" : "Сохранить"}</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>ИИ (mock)</h2>
        <div className="flex">
          <button type="button" onClick={handleAnalyze} disabled={analyzeLoading}>
            {analyzeLoading ? "Анализ…" : "Предложить категорию"}
          </button>
          <button type="button" onClick={handleSuggestReply} disabled={suggestLoading}>
            {suggestLoading ? "Генерация…" : "Предложить ответ"}
          </button>
        </div>
        {analyzeResult && (
          <div className="mt-2">
            <p><strong>Предложенная категория:</strong> {analyzeResult.predicted_category} (уверенность: {analyzeResult.confidence})</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b" }}>provider: {analyzeResult.provider}</p>
          </div>
        )}
        {suggestResult && (
          <div className="mt-2">
            <p><strong>Предложенный ответ:</strong></p>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f0fdf4", padding: "0.75rem", borderRadius: 6 }}>{suggestResult.suggested_reply}</pre>
            <p style={{ fontSize: "0.875rem", color: "#64748b" }}>provider: {suggestResult.provider}</p>
          </div>
        )}
      </div>
    </div>
  );
}
