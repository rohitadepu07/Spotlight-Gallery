import { Router } from "express";
import { db, eventsTable } from "../../db/src";
import { eq } from "drizzle-orm";
import { insertEventSchema } from "../../db/src/schema";

const router = Router();

// Get all events
router.get("/", async (req, res) => {
  try {
    const events = await db.select().from(eventsTable).all();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get event by ID or Code
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).get();
    if (!event) {
      // Try by QR code
      const eventByCode = await db.select().from(eventsTable).where(eq(eventsTable.qrCode, id)).get();
      if (!eventByCode) return res.status(404).json({ error: "Event not found" });
      return res.json(eventByCode);
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Create new event
router.post("/", async (req, res) => {
  try {
    const validatedBody = insertEventSchema.parse(req.body);
    const [newEvent] = await db.insert(eventsTable).values(validatedBody).returning();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ error: "Invalid event data", details: error });
  }
});

// Toggle visibility
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).get();
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    const [updatedEvent] = await db.update(eventsTable)
      .set({ isPublic: !event.isPublic })
      .where(eq(eventsTable.id, id))
      .returning();
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle visibility" });
  }
});

export default router;
