import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";
import { eventsTable } from "./events";

export const photosTable = sqliteTable("photos", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  eventId: text("event_id").references(() => eventsTable.id).notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  matchConfidence: real("match_confidence"),
  timestamp: text("timestamp"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const insertPhotoSchema = createInsertSchema(photosTable);
export const selectPhotoSchema = createSelectSchema(photosTable);
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = z.infer<typeof selectPhotoSchema>;
