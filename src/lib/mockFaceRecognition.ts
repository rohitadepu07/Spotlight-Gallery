
export interface Photo {
  id: string;
  url: string;
  thumbnail: string;
  event: string;
  eventId: string;
  timestamp: string;
  matchConfidence: number;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  photoCount: number;
  matchCount: number;
  isPublic: boolean;
  qrCode: string;
  coverUrl: string;
}

export const EVENT_PHOTOS: Record<string, Photo[]> = {
  "evt-001": [
    { id: "p1", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 8:34 PM", matchConfidence: 98.2 },
    { id: "p2", url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 9:05 PM", matchConfidence: 95.7 },
    { id: "p3", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 9:42 PM", matchConfidence: 91.3 },
    { id: "p4", url: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 10:11 PM", matchConfidence: 89.8 },
    { id: "p5", url: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 10:30 PM", matchConfidence: 87.4 },
    { id: "p6", url: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 11:00 PM", matchConfidence: 85.1 },
    { id: "p7", url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 11:22 PM", matchConfidence: 0 },
    { id: "p8", url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 15, 2025 · 11:45 PM", matchConfidence: 0 },
    { id: "p9", url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=60", event: "Summer Gala 2025", eventId: "evt-001", timestamp: "Jun 16, 2025 · 12:10 AM", matchConfidence: 0 },
  ],
  "evt-002": [
    { id: "q1", url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=60", event: "Tech Conference After-Party", eventId: "evt-002", timestamp: "May 28, 2025 · 7:00 PM", matchConfidence: 96.1 },
    { id: "q2", url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&q=60", event: "Tech Conference After-Party", eventId: "evt-002", timestamp: "May 28, 2025 · 7:45 PM", matchConfidence: 92.4 },
    { id: "q3", url: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&q=60", event: "Tech Conference After-Party", eventId: "evt-002", timestamp: "May 28, 2025 · 8:20 PM", matchConfidence: 0 },
    { id: "q4", url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=60", event: "Tech Conference After-Party", eventId: "evt-002", timestamp: "May 28, 2025 · 9:00 PM", matchConfidence: 88.9 },
    { id: "q5", url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=60", event: "Tech Conference After-Party", eventId: "evt-002", timestamp: "May 28, 2025 · 9:30 PM", matchConfidence: 0 },
    { id: "q6", url: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400&q=60", event: "Tech Conference After-Party", eventId: "evt-002", timestamp: "May 28, 2025 · 10:00 PM", matchConfidence: 0 },
  ],
  "evt-003": [
    { id: "r1", url: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&q=60", event: "Annual Awards Ceremony", eventId: "evt-003", timestamp: "Apr 10, 2025 · 6:00 PM", matchConfidence: 0 },
    { id: "r2", url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&q=60", event: "Annual Awards Ceremony", eventId: "evt-003", timestamp: "Apr 10, 2025 · 7:15 PM", matchConfidence: 93.5 },
    { id: "r3", url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&q=60", event: "Annual Awards Ceremony", eventId: "evt-003", timestamp: "Apr 10, 2025 · 7:50 PM", matchConfidence: 90.1 },
    { id: "r4", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=60", event: "Annual Awards Ceremony", eventId: "evt-003", timestamp: "Apr 10, 2025 · 8:30 PM", matchConfidence: 86.7 },
    { id: "r5", url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&q=60", event: "Annual Awards Ceremony", eventId: "evt-003", timestamp: "Apr 10, 2025 · 9:00 PM", matchConfidence: 0 },
    { id: "r6", url: "https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=800&q=80", thumbnail: "https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?w=400&q=60", event: "Annual Awards Ceremony", eventId: "evt-003", timestamp: "Apr 10, 2025 · 9:45 PM", matchConfidence: 0 },
  ],
};

export const MOCK_EVENTS: Event[] = [
  {
    id: "evt-001",
    name: "Summer Gala 2025",
    date: "June 15, 2025",
    photoCount: 347,
    matchCount: 89,
    isPublic: true,
    qrCode: "EVT-001-SUMMER-GALA",
    coverUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=70",
  },
  {
    id: "evt-002",
    name: "Tech Conference After-Party",
    date: "May 28, 2025",
    photoCount: 218,
    matchCount: 54,
    isPublic: false,
    qrCode: "EVT-002-TECH-CONF",
    coverUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=70",
  },
  {
    id: "evt-003",
    name: "Annual Awards Ceremony",
    date: "April 10, 2025",
    photoCount: 512,
    matchCount: 143,
    isPublic: true,
    qrCode: "EVT-003-AWARDS",
    coverUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=70",
  },
];

export async function searchFaceInGallery(
  _selfieFile: File,
  eventId: string,
  onProgress?: (progress: number) => void
): Promise<Photo[]> {
  const steps = [10, 25, 40, 55, 70, 85, 95, 100];
  for (const step of steps) {
    await new Promise((r) => setTimeout(r, 280 + Math.random() * 200));
    onProgress?.(step);
  }
  await new Promise((r) => setTimeout(r, 400));
  const eventPhotos = EVENT_PHOTOS[eventId] ?? [];
  return eventPhotos.filter((p) => p.matchConfidence > 0);
}
