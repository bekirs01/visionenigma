CREATE TABLE IF NOT EXISTS tickets (
    id          SERIAL PRIMARY KEY,
    sender      VARCHAR(255) NOT NULL,
    subject     VARCHAR(500),
    body        TEXT,
    status      VARCHAR(50) DEFAULT 'new',
    ai_response TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
    id            SERIAL PRIMARY KEY,
    ticket_id     INTEGER REFERENCES tickets(id),
    response_text TEXT,
    sent_at       TIMESTAMP DEFAULT NOW()
);