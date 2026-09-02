import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "teacher"]);

/**
 * App-level account (single-repo variant — replaces per-person GitHub PATs).
 * `passwordHash` = sha256(salt + ":" + password), hex — see src/lib/auth/password.ts.
 * This is a UI-level gate, not a real security boundary (see config.ts) —
 * hashing keeps a casual read of users.json from exposing plaintext, no more.
 */
export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  salt: z.string(),
  passwordHash: z.string(),
  role: userRoleSchema,
  /** Links to settings.teachers[].id — required when role is "teacher". */
  teacherId: z.string().nullable(),
  active: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

export const usersFileSchema = z.object({
  users: z.array(userSchema),
});
export type UsersFile = z.infer<typeof usersFileSchema>;
