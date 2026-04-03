from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    name: str
    email: str
    phone: str | None = None
    bio: str | None = None
    role: str


class ParticipantSessionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)


class ParticipantSessionResponse(BaseModel):
    participantId: str
    status: str
    profile: UserProfile


class AdminLoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class AdminRegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class AdminLoginResponse(BaseModel):
    status: str
    profile: UserProfile


class AdminRegisterResponse(BaseModel):
    status: str
    profile: UserProfile
