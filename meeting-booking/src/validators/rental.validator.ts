import { z } from "zod";

export const RentalCreateInput = z.object({
  carId: z.string().min(1, "Car ID is required"),
  startTime: z.string().datetime("Invalid ISO datetime format"),
  endTime: z.string().datetime("Invalid ISO datetime format"),
});

export type CreateRentalInput = z.infer<typeof RentalCreateInput>;
