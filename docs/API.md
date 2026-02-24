# API Endpoints (Backend — FastAPI)

Base URL: `http://localhost:8000` (lokal). Frontend proxy kullanıyorsa istekler `http://localhost:3000/api/*` ve `http://localhost:3000/health` üzerinden gider, Next.js bunları 8000'e yönlendirir.

## Health

| Method | Path    | Açıklama        |
|--------|---------|-----------------|
| GET    | /health | Servis sağlık   |

**Örnek:** `curl -s http://localhost:8000/health`  
**Yanıt:** `{"status":"ok","service":"support-mvp-backend"}`

---

## Categories

| Method | Path              | Açıklama          |
|--------|-------------------|-------------------|
| GET    | /api/categories   | Kategori listesi  |
| POST   | /api/categories   | Kategori oluştur  |
| GET    | /api/categories/{id} | Tek kategori   |

---

## Tickets (Обращения)

| Method | Path                        | Açıklama                    |
|--------|-----------------------------|-----------------------------|
| GET    | /api/tickets                | Liste (query: search, status, category_id, limit, offset) |
| POST   | /api/tickets                | Yeni kayıt                  |
| GET    | /api/tickets/{id}           | Tek kayıt                   |
| PATCH  | /api/tickets/{id}           | Güncelle (status, priority, category_id, subject, body) |
| GET    | /api/tickets/export.csv     | CSV export (query: search, status, category_id) |
| POST   | /api/tickets/{id}/analyze   | Mock AI: kategori öner      |
| POST   | /api/tickets/{id}/suggest-reply | Mock AI: cevap öner    |

### GET /api/tickets

Query params: `search`, `status`, `category_id`, `limit` (default 50), `offset` (default 0).

**Örnek:** `curl -s "http://localhost:8000/api/tickets?limit=5"`

### POST /api/tickets

Body (JSON):

```json
{
  "sender_email": "user@example.com",
  "subject": "Konu",
  "body": "Mesaj metni",
  "status": "new",
  "priority": "medium",
  "category_id": null,
  "source": "manual"
}
```

### PATCH /api/tickets/{id}

Body (JSON, tümü opsiyonel): `status`, `priority`, `category_id`, `subject`, `body`.

---

## Seed

| Method | Path            | Açıklama        |
|--------|-----------------|-----------------|
| POST   | /api/seed-demo  | Demo kategoriler + ticket'lar oluştur |

**Örnek:** `curl -X POST http://localhost:8000/api/seed-demo`

---

## CORS

Backend şu origin’lere izin verir: `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000`, `http://127.0.0.1:3001`, `http://frontend:3000`. Credentials, tüm method ve header’lar açık; `Content-Disposition` expose edilir (CSV indirme için).
