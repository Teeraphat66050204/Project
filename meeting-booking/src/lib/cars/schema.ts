import { z } from "zod";

export const CarCreate = z.object({
  name: z.string().min(1),
  seats: z.number().int().min(1),
});

export const CarUpdate = z.object({
  name: z.string().min(1).optional(),
  seats: z.number().int().min(1).optional(),
});

export type CarCreateInput = z.infer<typeof CarCreate>;
export type CarUpdateInput = z.infer<typeof CarUpdate>;
