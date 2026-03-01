import { listCarsController } from "@/controllers/car.controller";

export async function GET() {
  return listCarsController();
}

