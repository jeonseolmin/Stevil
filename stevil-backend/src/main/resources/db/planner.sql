-- Optional explicit migration when Hibernate schema updates are disabled.
-- Run against the application database, not the separate RAG database.
CREATE TABLE IF NOT EXISTS weekly_plans (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    revision BIGINT NOT NULL,
    payload TEXT NOT NULL,
    UNIQUE (user_id, week_start)
);
