import { z } from "zod";

/** Join screen fields — RHF + Zod (L3). */
export const joinSessionFormSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z]{4}$/, "Enter a 4-letter session code."),
  playerRole: z.enum(["seeker", "hider", "observer", "admin"]),
  rolePasscode: z
    .string()
    .max(4)
    .regex(/^([A-Z]{0,4})$/, "Role code must be letters only."),
});

export type JoinSessionFormValues = z.infer<typeof joinSessionFormSchema>;
