# Spotlight Backend (FastAPI + PostgreSQL)

Python backend for your existing Spotlight frontend.

## Folder Structure

```text
backend/
  app/
    api/
      v1/
        routes/
          auth.py            # Admin login + participant session endpoints
          students.py        # Student auth + enrollment + matched-photo endpoints
          events.py          # Event CRUD + visibility toggle
          photos.py          # Bulk photo upload + embedding extraction
          matching.py        # Selfie matching endpoint
          health.py          # Health check
        router.py            # API route composition
    core/
      config.py              # Env-driven settings
    db/
      init_db.py             # SQLAlchemy table bootstrap
      session.py             # Engine + DB session dependency
    models/
      base.py
      event.py               # Events table model
      photo.py               # Photos table model
      face_embedding.py      # FaceEmbeddings table model
      student.py             # Student users + event enrollments
    schemas/
      event.py               # Event request/response schemas
      photo.py               # Photo upload + match response schemas
    services/
      naming.py              # Slug/access code helpers
      serializers.py         # DB model -> frontend shape mapping
      storage.py             # Local/S3/Cloudinary adapters
      face_engine.py         # Face extraction provider (mock/face-recognition)
      matching.py            # Cosine similarity matching logic
      dependencies.py        # Cached service dependencies
    main.py                  # FastAPI app entrypoint
  sql/
    001_init_spotlight.sql   # SQL schema migration
  .env.example
  requirements.txt
```

## Core Tables

### `events`

- `id` (UUID, PK)
- `slug` (unique)
- `name` (required)
- `description`
- `event_date` (DATE)
- `is_public` (boolean)
- `access_code` (unique QR/event code for guests)
- `cover_image_url`
- `photo_count` (denormalized counter)
- `match_count` (denormalized counter)
- `created_at`, `updated_at`

### `face_embeddings`

- `id` (UUID, PK)
- `event_id` (FK -> `events.id`)
- `photo_id` (FK -> `photos.id`, nullable for selfie embeddings)
- `embedding` (`DOUBLE PRECISION[]`)
- `source` (`event_photo` | `guest_selfie`)
- `face_box` (JSONB: top/left/width/height)
- `confidence`
- `model_name`

Indexes:
- `event_id`
- `photo_id`
- composite `(event_id, photo_id)`

## Run Locally

1. Create a virtual environment.
2. Install dependencies from `requirements.txt`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL`.
4. Start API:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs:
- `http://localhost:8000/docs`

## Frontend Compatibility Notes

Responses are shaped to match your existing frontend types:

- Event fields: `date`, `photoCount`, `matchCount`, `isPublic`, `qrCode`, `coverUrl`
- Photo fields: `thumbnailUrl`, `thumbnail`, `eventId`, `matchConfidence`

Additional sync endpoints wired to frontend actions:
- `POST /api/v1/auth/participant/session`
- `POST /api/v1/auth/admin/login`
- `POST /api/v1/students/register`
- `POST /api/v1/students/login`
- `POST /api/v1/students/{student_id}/enroll`
- `GET /api/v1/students/{student_id}/events`
- `GET /api/v1/students/{student_id}/events/{event_id}/photos`
- `GET /api/v1/events/{identifier}/join-link`
- `GET /api/v1/photos/{photo_id}/links`

## Local Image Storage Setup (No S3 Needed)

You can run everything locally without S3/Cloudinary.

1. In `backend/.env`, keep:
   - `STORAGE_BACKEND=local`
   - `LOCAL_STORAGE_PATH=./storage`
   - `PUBLIC_BASE_URL=http://localhost:8000/storage`
2. Start backend on port `8000`:
   - `uvicorn app.main:app --reload --port 8000`
3. Start frontend with `VITE_API_BASE_URL` pointing to backend API:
   - `http://localhost:8000/api/v1`
4. Upload photos in organizer upload view. Files are stored under:
   - `backend/storage/<event_id>/...`
5. Ensure frontend is opened from the same machine (`localhost`) so image URLs resolve correctly.
