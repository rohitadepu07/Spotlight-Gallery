import { Event, Photo, UserProfile } from "../types";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const API_BASE_URL = viteEnv.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api/v1";

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
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
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

export interface HomeMetrics {
  photosIndexed: number;
  facesIndexed: number;
  publicEvents: number;
  matchRate: number;
  avgSearchSeconds: number;
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
    return request<{ participantId: string; status: string; profile: UserProfile }>("/auth/participant/session", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    });
  },

  async adminLogin(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async adminRegister(name: string, email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/admin/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
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
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
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
      const text = await response.text();
      throw new Error(text || `Request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as { photos?: Photo[] };
    return payload.photos ?? [];
  },
};
