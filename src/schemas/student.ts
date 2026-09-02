import { z } from "zod";
import { dateStringSchema } from "./common";

// "trial" added per the studio's actual reference list (Настройки!Статус ученика) —
// broader than the client status enum, since a student can be mid-trial before enrolling.
export const studentStatusSchema = z.enum(["trial", "active", "paused", "left"]);
export const sexSchema = z.enum(["F", "M"]);

export const studentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string(),
  birthDate: dateStringSchema,
  sex: sexSchema,
  partnerId: z.string().nullable(),
  startedAt: dateStringSchema,
  status: studentStatusSchema,
  specialDiscount: z.number().min(0).max(1),
  healthDeclaration: z.boolean(),
  photoConsent: z.boolean(),
  notes: z.string(),
});
export type Student = z.infer<typeof studentSchema>;
