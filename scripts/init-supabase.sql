-- Supabase'de tabloları oluşturmak için: Supabase Dashboard -> SQL Editor -> New query -> bu dosyanın içeriğini yapıştır -> Run
-- (Alembic kullanıyorsan: backend klasöründe DATABASE_URL ile "alembic upgrade head" çalıştır)

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255),
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS ix_tickets_sender_email ON tickets(sender_email);
CREATE INDEX IF NOT EXISTS ix_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS ix_tickets_created_at ON tickets(created_at);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    raw_text TEXT,
    parsed_text TEXT NOT NULL,
    subject VARCHAR(500),
    sender_email VARCHAR(255),
    recipient_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_messages_ticket_id ON messages(ticket_id);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    predicted_category VARCHAR(100),
    confidence FLOAT,
    suggested_reply TEXT,
    provider VARCHAR(50) NOT NULL,
    model_version VARCHAR(100),
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_analyses_ticket_id ON ai_analyses(ticket_id);

CREATE TABLE IF NOT EXISTS kb_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    tags TEXT,
    source_url VARCHAR(1000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo kategorileri
INSERT INTO categories (name, description) VALUES
  ('billing', 'Платежи и подписки'),
  ('technical', 'Технические проблемы'),
  ('access', 'Доступ и аккаунт'),
  ('other', 'Прочее')
ON CONFLICT (name) DO NOTHING;
