import hashlib

from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminRegisterRequest,
    AdminRegisterResponse,
    ParticipantSessionCreate,
    ParticipantSessionResponse,
    UserProfile,
)

router = APIRouter(prefix="/auth", tags=["auth"])

ADMIN_USERS: dict[str, dict[str, str]] = {
    "admin@spotlight.dev": {
        "name": "Admin User",
        "email": "admin@spotlight.dev",
        "password": "admin123",
        "phone": "+1 (555) 000-0000",
        "bio": "Event organizer",
    }
}


@router.post("/participant/session", response_model=ParticipantSessionResponse)
def create_participant_session(payload: ParticipantSessionCreate) -> dict:
    participant_seed = f"{payload.name.lower()}::{payload.email.lower()}"
    participant_id = hashlib.sha1(participant_seed.encode("utf-8")).hexdigest()[:12]
    profile = UserProfile(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone="",
        bio="Event guest",
        role="participant",
    )
    return {
        "participantId": participant_id,
        "status": "active",
        "profile": profile.model_dump(),
    }


@router.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest) -> dict:
    email = payload.email.strip().lower()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid username or password")
    user = ADMIN_USERS.get(email)
    if not user or user["password"] != password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    profile = UserProfile(
        name=user["name"],
        email=user["email"],
        phone=user.get("phone") or "",
        bio=user.get("bio") or "",
        role="admin",
    )
    return {"status": "ok", "profile": profile.model_dump()}


@router.post("/admin/register", response_model=AdminRegisterResponse, status_code=status.HTTP_201_CREATED)
def admin_register(payload: AdminRegisterRequest) -> dict:
    email = payload.email.strip().lower()
    if email in ADMIN_USERS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    ADMIN_USERS[email] = {
        "name": payload.name.strip(),
        "email": email,
        "password": payload.password,
        "phone": "",
        "bio": "Event organizer",
    }
    profile = UserProfile(
        name=ADMIN_USERS[email]["name"],
        email=email,
        phone="",
        bio="Event organizer",
        role="admin",
    )
    return {"status": "created", "profile": profile.model_dump()}
