import { Event, Photo, UserProfile } from "../types";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE_URL = viteEnv.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function parseDateToISO(dateLike?: string): string {
  if (!dateLike) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const apiError = await parseApiError(response);
    throw apiError;
  }
  return response.json() as Promise<T>;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;
  let payload: unknown;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
      const detail = (payload as { detail?: unknown } | null)?.detail;
      if (typeof detail === "string" && detail.trim()) {
        message = detail;
      } else if (typeof payload === "string" && payload.trim()) {
        message = payload;
      }
    } catch {
      // Ignore parse errors and keep fallback message.
    }
  } else {
    const text = (await response.text()).trim();
    if (text) {
      message = text;
    }
  }

  return new ApiError(response.status, message, payload);
}

export interface UploadPhotosResult {
  uploaded: number;
  facesDetected: number;
  photos: Photo[];
}

export interface EventJoinLinkResult {
  eventId: string;
  qrCode: string;
  joinUrl: string;
}

export interface PhotoLinksResult {
  photoId: string;
  eventId: string;
  qrCode: string;
  downloadUrl: string;
  shareUrl: string;
}

export interface AuthResponse {
  status: string;
  profile: UserProfile;
}

type ProfilePayload = UserProfile & {
  avatar_url?: string | null;
};

type AuthResponsePayload = {
  status: string;
  profile: ProfilePayload;
};

export interface StudentEnrollRequest {
  code: string;
}

export interface HomeMetrics {
  photosIndexed: number;
  facesIndexed: number;
  publicEvents: number;
  matchRate: number;
  avgSearchSeconds: number;
}

function normalizeProfile(profile: ProfilePayload): UserProfile {
  const { avatar_url, avatarUrl, ...rest } = profile;
  const normalizedAvatar = avatarUrl ?? avatar_url ?? undefined;
  return { ...rest, avatarUrl: normalizedAvatar };
}

function normalizeAuthResponse(payload: AuthResponsePayload): AuthResponse {
  return {
    status: payload.status,
    profile: normalizeProfile(payload.profile),
  };
}

export const api = {
  async health(): Promise<{ status: string; timestamp?: string }> {
    return request<{ status: string; timestamp?: string }>("/health");
  },

  async getHomeMetrics(): Promise<HomeMetrics> {
    return request<HomeMetrics>("/metrics/home");
  },

  async createParticipantSession(
    name: string,
    email: string
  ): Promise<{ participantId: string; status: string; profile: UserProfile }> {
    const payload = await request<{ participantId: string; status: string; profile: ProfilePayload }>("/auth/participant/session", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    });
    return { ...payload, profile: normalizeProfile(payload.profile) };
  },

  async adminLogin(email: string, password: string): Promise<AuthResponse> {
    const payload = await request<AuthResponsePayload>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return normalizeAuthResponse(payload);
  },

  async adminRegister(name: string, email: string, password: string): Promise<AuthResponse> {
    const payload = await request<AuthResponsePayload>("/auth/admin/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    return normalizeAuthResponse(payload);
  },

  async studentLogin(email: string, password: string): Promise<AuthResponse> {
    const payload = await request<AuthResponsePayload>("/students/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return normalizeAuthResponse(payload);
  },

  async studentRegister(name: string, email: string, password: string, selfie: File): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("selfie", selfie);

    const response = await fetch(`${API_BASE_URL}/students/register`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw await parseApiError(response);
    }
    const payload = (await response.json()) as AuthResponsePayload;
    return normalizeAuthResponse(payload);
  },

  async enrollStudentInEvent(studentId: string, code: string): Promise<Event> {
    return request<Event>(`/students/${studentId}/enroll`, {
      method: "POST",
      body: JSON.stringify({ code } as StudentEnrollRequest),
    });
  },

  async getStudentEvents(studentId: string): Promise<Event[]> {
    return request<Event[]>(`/students/${studentId}/events`);
  },

  async getStudentMatchedPhotos(studentId: string, eventId: string): Promise<Photo[]> {
    return request<Photo[]>(`/students/${studentId}/events/${eventId}/photos`);
  },

  async getEvents(options?: { includePrivate?: boolean }): Promise<Event[]> {
    const includePrivate = options?.includePrivate ?? true;
    return request<Event[]>(`/events?include_private=${includePrivate ? "true" : "false"}`);
  },

  async getEvent(id: string): Promise<Event> {
    return request<Event>(`/events/${id}`);
  },

  async createEvent(data: Partial<Event>): Promise<Event> {
    return request<Event>("/events", {
      method: "POST",
      body: JSON.stringify({
        name: data.name ?? "Untitled Event",
        description: data.description ?? null,
        event_date: parseDateToISO(data.date),
        is_public: data.isPublic ?? true,
        cover_image_url: data.coverUrl ?? null,
      }),
    });
  },

  async toggleEventVisibility(id: string): Promise<Event> {
    return request<Event>(`/events/${id}/toggle-visibility`, { method: "PATCH" });
  },

  async getEventJoinLink(id: string): Promise<EventJoinLinkResult> {
    return request<EventJoinLinkResult>(`/events/${id}/join-link`);
  },

  async getEventPhotos(eventId: string): Promise<Photo[]> {
    return request<Photo[]>(`/photos/event/${eventId}`);
  },

  async getPhotoLinks(photoId: string): Promise<PhotoLinksResult> {
    return request<PhotoLinksResult>(`/photos/${photoId}/links`);
  },

  async uploadEventPhotos(eventId: string, files: File[] | FileList): Promise<UploadPhotosResult> {
    const formData = new FormData();
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    fileArray.forEach((file) => formData.append("files", file));

    const response = await fetch(`${API_BASE_URL}/photos/event/${eventId}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw await parseApiError(response);
    }
    return response.json() as Promise<UploadPhotosResult>;
  },

  async addPhoto(_eventId: string, _data: Partial<Photo>): Promise<Photo> {
    throw new Error("Use the multipart upload endpoint from the backend (/photos/event/{event_id}).");
  },

  async matchSelfie(eventId: string, selfie: File): Promise<Photo[]> {
    const formData = new FormData();
    formData.append("selfie", selfie);
    const response = await fetch(`${API_BASE_URL}/matching/event/${eventId}/selfie`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw await parseApiError(response);
    }
    const payload = (await response.json()) as { photos?: Photo[] };
    return payload.photos ?? [];
  },
};
