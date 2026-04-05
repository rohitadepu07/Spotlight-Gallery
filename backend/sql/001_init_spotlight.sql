-- Spotlight initial schema for PostgreSQL
-- Run this once if you prefer SQL migrations over SQLAlchemy create_all.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'embedding_source') THEN
        CREATE TYPE embedding_source AS ENUM ('event_photo', 'guest_selfie');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(180) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    access_code VARCHAR(24) NOT NULL UNIQUE,
    cover_image_url TEXT NULL,
    photo_count INTEGER NOT NULL DEFAULT 0,
    match_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS ix_events_access_code ON events(access_code);

CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    storage_key VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT NULL,
    captured_at TIMESTAMPTZ NULL,
    match_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_photos_event_id ON photos(event_id);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    photo_id UUID NULL REFERENCES photos(id) ON DELETE CASCADE,
    embedding DOUBLE PRECISION[] NOT NULL,
    source embedding_source NOT NULL DEFAULT 'event_photo',
    face_box JSONB NULL,
    confidence DOUBLE PRECISION NULL,
    model_name VARCHAR(80) NOT NULL DEFAULT 'face_recognition_128d',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_face_embeddings_event_id ON face_embeddings(event_id);
CREATE INDEX IF NOT EXISTS ix_face_embeddings_photo_id ON face_embeddings(photo_id);
CREATE INDEX IF NOT EXISTS ix_face_embeddings_event_photo ON face_embeddings(event_id, photo_id);

CREATE TABLE IF NOT EXISTS student_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    selfie_embedding DOUBLE PRECISION[] NULL,
    selfie_model_name VARCHAR(80) NOT NULL DEFAULT 'face_recognition_128d',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_student_users_email ON student_users(email);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT uq_student_enrollment_student_event UNIQUE (student_id, event_id)
);

CREATE INDEX IF NOT EXISTS ix_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS ix_student_enrollments_event_id ON student_enrollments(event_id);
