import type { APIContext } from "astro";
import { requireAdmin } from "../guard";
import { CarCreate, CarUpdate } from "./schema";
import * as svc from "./service";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleList(_: APIContext) {
  const carsRaw = await svc.listCars();
  const cars = carsRaw.map((car) => ({
    id: car.id,
    name: car.name,
    seats: car.capacity,
  }));

  return json({ ok: true, data: cars });
}

export async function handleGet(ctx: APIContext) {
  const id = ctx.params?.id as string | undefined;
  if (!id) return json({ error: "MISSING_ID" }, 400);

  const car = await svc.getCarById(id);
  if (!car) return json({ error: "NOT_FOUND" }, 404);

  return json({
    ok: true,
    data: {
      id: car.id,
      name: car.name,
      seats: car.capacity,
    },
  });
}

export async function handleCreate(ctx: APIContext) {
  const s = requireAdmin(ctx);
  if (s instanceof Response) return s;

  const raw = await ctx.request.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const v = CarCreate.safeParse(parsed);
  if (!v.success) return json({ error: "INVALID_INPUT", issues: v.error.issues }, 400);

  const created = await svc.createCar(v.data);
  return json(
    {
      ok: true,
      data: {
        id: created.id,
        name: created.name,
        seats: created.capacity,
      },
    },
    201,
  );
}

export async function handleUpdate(ctx: APIContext) {
  const s = requireAdmin(ctx);
  if (s instanceof Response) return s;

  const id = ctx.params?.id as string | undefined;
  if (!id) return json({ error: "MISSING_ID" }, 400);

  const raw = await ctx.request.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const v = CarUpdate.safeParse(parsed);
  if (!v.success) return json({ error: "INVALID_INPUT", issues: v.error.issues }, 400);

  try {
    const updated = await svc.updateCar(id, v.data);
    return json({
      ok: true,
      data: {
        id: updated.id,
        name: updated.name,
        seats: updated.capacity,
      },
    });
  } catch {
    return json({ error: "NOT_FOUND" }, 404);
  }
}

export async function handleDelete(ctx: APIContext) {
  const s = requireAdmin(ctx);
  if (s instanceof Response) return s;

  const id = ctx.params?.id as string | undefined;
  if (!id) return json({ error: "MISSING_ID" }, 400);

  try {
    await svc.deleteCar(id);
    return json({ ok: true });
  } catch {
    return json({ error: "NOT_FOUND" }, 404);
  }
}
