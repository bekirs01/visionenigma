# Çalıştırma ve kabul testleri

## Çalıştırma (lokal)

### Tek komut (önerilen)

```bash
cd /Users/bekirsucikaran/Desktop/visionenigma
./start.sh
```

- Backend port 8000’de, frontend port 3000’de başlar.
- Tarayıcıda **http://localhost:3000** açın.
- Bu Terminal penceresini kapatmayın.

### Ayrı ayrı

**1) Backend**

```bash
cd backend
source venv/bin/activate   # veya: . venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**2) Frontend (yeni terminal)**

```bash
cd frontend
npm install
npm run dev
```

Tarayıcıda **http://localhost:3000**.

---

## Ortam değişkenleri

- **Backend:** `backend/.env` — `DATABASE_URL` (Supabase veya yerel Postgres). Örnek: `.env.example` içeriği.
- **Yerel çalışma:** `./start.sh` backend'i `USE_SQLITE=1` ile başlatır; böylece Supabase erişilemezse bile Internal Server Error oluşmaz, SQLite kullanılır.
- **Frontend:** `frontend/.env.local` opsiyonel — `NEXT_PUBLIC_API_BASE_URL` boş bırakılırsa Next.js proxy kullanır (`/api` ve `/health` → 8000).

---

## Kabul testleri

1. **Backend health**  
   `curl -s http://localhost:8000/health`  
   Beklenen: `{"status":"ok","service":"support-mvp-backend"}`

2. **Frontend açılır, kırmızı hata yok**  
   http://localhost:3000 açılır; “Sunucuya bağlanılamadı” kutusu görünmez (backend çalışıyorsa).

3. **“Создать” ile kayıt**  
   Formu doldurup “Создать” (Oluştur) tıklayın. Supabase (veya kullandığınız DB) `tickets` tablosunda yeni satır görünmeli. Sayfa yenilendiğinde kayıt listede olmalı.

4. **“Seed демо”**  
   “Seed демо” tıklanır; liste güncellenir ve yeni satırlar eklenir.

5. **Filtre ve arama**  
   Status/kategori seçimi ve arama kutusu ile liste filtrelenir; sonuçlar backend’den gelir.

6. **“Экспорт CSV”**  
   Tıklanınca `tickets.csv` indirilir; içerik mevcut filtreye göre doğru olmalı.

7. **“Yeniden dene”**  
   Backend kapatılıp sayfa yenilendiğinde kırmızı kutu çıkar; backend tekrar açıldığında “Yeniden dene” ile liste geri gelir.

---

## Sorun giderme

- **“Sunucuya bağlanılamadı”**  
  Backend 8000’de çalışmıyor. `./start.sh` kullanın veya backend’i ayrı terminalde başlatın.

- **404 (frontend)**  
  Adres **http://localhost:3000** olmalı (3001 değil, port farklıysa terminalde yazan adresi kullanın).

- **CORS hatası**  
  Proxy kullanıyorsanız (NEXT_PUBLIC_API_BASE_URL boş) CORS olmamalı. Doğrudan 8000 kullanıyorsanız backend CORS ayarları `main.py` içinde tanımlı; tarayıcı konsolunda hata varsa origin’i kontrol edin.

- **DB bağlantı hatası**  
  `backend/.env` içinde `DATABASE_URL` doğru ve Supabase/Postgres erişilebilir olmalı; şifrede özel karakter varsa URL-encode kullanın.

- **Supabase’e “No route to host”**  
  Ağdan Supabase’e erişilemiyorsa lokal test için SQLite kullanabilirsiniz. Backend’i şöyle başlatın:
  ```bash
  cd backend
  DATABASE_URL="sqlite:///./support_mvp.db" ./venv/bin/python -m alembic upgrade head
  DATABASE_URL="sqlite:///./support_mvp.db" ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
  Frontend aynı kalır; Oluştur, Seed, Export hepsi SQLite’a yazar/okur.
