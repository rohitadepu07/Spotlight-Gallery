export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  thumbnail?: string; // For backward compatibility
  event: string;
  eventId: string;
  timestamp: string;
  matchConfidence: number;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  photoCount?: number;
  matchCount?: number;
  isPublic: boolean;
  qrCode: string;
  coverUrl: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  role: "admin" | "participant";
}
