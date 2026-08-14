import { z } from "zod";

export const groupSchema = z.object({
  group_name: z.string().min(2, "Name must be at least 2 characters").max(120),
  group_type: z.enum(["poshak", "sakshi", "aatmiy"]),
  // Comes from the leader picker; undefined until one is chosen.
  poshak_leader_id: z
    .number()
    .int()
    .positive("Poshak leader is required")
    .optional()
    .refine((v) => v !== undefined, "Poshak leader is required"),
});

export type GroupFormData = z.infer<typeof groupSchema>;
