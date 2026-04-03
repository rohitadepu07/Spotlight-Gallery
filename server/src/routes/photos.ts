import { Router } from "express";
import { db, photosTable } from "../../db/src";
import { eq } from "drizzle-orm";
import { insertPhotoSchema } from "../../db/src/schema";

const router = Router();

// Get photos for an event
router.get("/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const photos = await db.select().from(photosTable).where(eq(photosTable.eventId, eventId)).all();
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

// Add photo to event (simplified for now, expects URL)
router.post("/event/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const validatedBody = insertPhotoSchema.parse({ ...req.body, eventId });
    const [newPhoto] = await db.insert(photosTable).values(validatedBody).returning();
    res.status(201).json(newPhoto);
  } catch (error) {
    res.status(400).json({ error: "Invalid photo data", details: error });
  }
});

export default router;
