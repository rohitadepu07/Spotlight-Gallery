import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

export const eventsTable = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).default(true).notNull(),
  qrCode: text("qr_code").unique().notNull(),
  coverUrl: text("cover_url"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const insertEventSchema = createInsertSchema(eventsTable);
export const selectEventSchema = createSelectSchema(eventsTable);
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = z.infer<typeof selectEventSchema>;
