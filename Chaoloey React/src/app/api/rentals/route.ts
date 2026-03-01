import { createRentalController, listRentalsController } from "@/controllers/rental.controller";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return listRentalsController(searchParams);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return createRentalController(body);
}
