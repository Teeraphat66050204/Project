import { availableCarsController } from "@/controllers/car.controller";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return availableCarsController(url.searchParams);
}

