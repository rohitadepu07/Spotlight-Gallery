import { Event, Photo } from "../types";

// ─── In-memory mock store (persists during session) ───
const SAMPLE_EVENTS: Event[] = [
  {
    id: "evt-001-summer-gala",
    name: "Summer Gala 2025",
    description: "Annual summer celebration with live music and dancing",
    date: "June 15, 2025",
    photoCount: 342,
    matchCount: 89,
    isPublic: true,
    qrCode: "EVT-SG2025",
    coverUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
  },
  {
    id: "evt-002-wedding-reception",
    name: "Wedding Reception",
    description: "Sarah & James' beautiful wedding celebration",
    date: "July 22, 2025",
    photoCount: 567,
    matchCount: 134,
    isPublic: true,
    qrCode: "EVT-WR2025",
    coverUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
  },
  {
    id: "evt-003-corporate-meetup",
    name: "Corporate Meetup",
    description: "Annual company team building event",
    date: "August 5, 2025",
    photoCount: 168,
    matchCount: 63,
    isPublic: false,
    qrCode: "EVT-CM2025",
    coverUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  },
];

const SAMPLE_PHOTOS: Photo[] = [
  { id: "p1", url: "https://images.unsplash.com/photo-1529543544282-ea903407407f?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1529543544282-ea903407407f?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1529543544282-ea903407407f?w=300&q=80", event: "Summer Gala 2025", eventId: "evt-001-summer-gala", timestamp: "2025-06-15T18:30:00Z", matchConfidence: 0.95 },
  { id: "p2", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&q=80", event: "Summer Gala 2025", eventId: "evt-001-summer-gala", timestamp: "2025-06-15T19:00:00Z", matchConfidence: 0.88 },
  { id: "p3", url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80", event: "Summer Gala 2025", eventId: "evt-001-summer-gala", timestamp: "2025-06-15T19:30:00Z", matchConfidence: 0.92 },
  { id: "p4", url: "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=300&q=80", event: "Summer Gala 2025", eventId: "evt-001-summer-gala", timestamp: "2025-06-15T20:00:00Z", matchConfidence: 0.85 },
  { id: "p5", url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=300&q=80", event: "Wedding Reception", eventId: "evt-002-wedding-reception", timestamp: "2025-07-22T16:00:00Z", matchConfidence: 0.97 },
  { id: "p6", url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300&q=80", event: "Wedding Reception", eventId: "evt-002-wedding-reception", timestamp: "2025-07-22T17:00:00Z", matchConfidence: 0.91 },
  { id: "p7", url: "https://images.unsplash.com/photo-1532635241-17e820acc59f?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1532635241-17e820acc59f?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1532635241-17e820acc59f?w=300&q=80", event: "Wedding Reception", eventId: "evt-002-wedding-reception", timestamp: "2025-07-22T18:00:00Z", matchConfidence: 0.89 },
  { id: "p8", url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=300&q=80", event: "Corporate Meetup", eventId: "evt-003-corporate-meetup", timestamp: "2025-08-05T10:00:00Z", matchConfidence: 0.93 },
  { id: "p9", url: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=300&q=80", event: "Corporate Meetup", eventId: "evt-003-corporate-meetup", timestamp: "2025-08-05T11:00:00Z", matchConfidence: 0.86 },
  { id: "p10", url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&q=80", event: "Summer Gala 2025", eventId: "evt-001-summer-gala", timestamp: "2025-06-15T20:30:00Z", matchConfidence: 0.94 },
  { id: "p11", url: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=300&q=80", event: "Summer Gala 2025", eventId: "evt-001-summer-gala", timestamp: "2025-06-15T21:00:00Z", matchConfidence: 0.87 },
  { id: "p12", url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", thumbnailUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&q=80", thumbnail: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&q=80", event: "Wedding Reception", eventId: "evt-002-wedding-reception", timestamp: "2025-07-22T19:00:00Z", matchConfidence: 0.90 },
];

// In-memory store
let mockEvents = [...SAMPLE_EVENTS];

function generateId(): string {
  return `evt-${Math.random().toString(36).substring(2, 8)}`;
}

export const api = {
  // Events
  async getEvents(): Promise<Event[]> {
    return [...mockEvents];
  },

  async getEvent(id: string): Promise<Event> {
    const event = mockEvents.find(e => e.id === id);
    if (!event) throw new Error("Event not found");
    return { ...event };
  },

  async createEvent(data: Partial<Event>): Promise<Event> {
    const newEvent: Event = {
      id: generateId(),
      name: data.name || "Untitled Event",
      description: data.description || "",
      date: data.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      photoCount: 0,
      matchCount: 0,
      isPublic: data.isPublic ?? true,
      qrCode: data.qrCode || `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      coverUrl: data.coverUrl || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    };
    mockEvents = [newEvent, ...mockEvents];
    return { ...newEvent };
  },

  async toggleEventVisibility(id: string): Promise<Event> {
    mockEvents = mockEvents.map(e => e.id === id ? { ...e, isPublic: !e.isPublic } : e);
    const event = mockEvents.find(e => e.id === id);
    if (!event) throw new Error("Event not found");
    return { ...event };
  },

  // Photos
  async getEventPhotos(eventId: string): Promise<Photo[]> {
    return SAMPLE_PHOTOS.filter(p => p.eventId === eventId);
  },

  async addPhoto(eventId: string, data: Partial<Photo>): Promise<Photo> {
    const photo: Photo = {
      id: `p-${Math.random().toString(36).substring(2, 8)}`,
      url: data.url || "",
      thumbnailUrl: data.thumbnailUrl || data.url || "",
      thumbnail: data.thumbnail || data.thumbnailUrl || data.url || "",
      event: data.event || "",
      eventId,
      timestamp: new Date().toISOString(),
      matchConfidence: data.matchConfidence || 0,
    };
    SAMPLE_PHOTOS.push(photo);
    return { ...photo };
  }
};
