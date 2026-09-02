import { z } from "zod";
import { dateStringSchema } from "./common";

export const clientTypeSchema = z.enum(["parent", "self"]);
export const clientStatusSchema = z.enum(["active", "paused", "left"]);

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  type: clientTypeSchema,
  status: clientStatusSchema,
  specialDiscount: z.number().min(0).max(1),
  source: z.string(),
  registeredAt: dateStringSchema,
  notes: z.string(),
});
export type Client = z.infer<typeof clientSchema>;
