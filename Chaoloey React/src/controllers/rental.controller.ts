import { getSessionFromCookies } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { cancelRental, createRental, deleteRentalByAdmin, getRental, getRentals, RentalError } from "@/services/rental.service";

function mapRentalRow(r: {
  id: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  user?: { id: string; name: string; email: string } | null;
  room?: { id: string; name: string; capacity: number } | null;
}) {
  return {
    id: r.id,
    carId: r.roomId,
    userId: r.userId,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
    user: r.user ?? undefined,
    car: r.room ? { id: r.room.id, name: r.room.name, seats: r.room.capacity } : undefined,
  };
}

export async function listRentalsController(searchParams: URLSearchParams) {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);

  const carId = searchParams.get("carId") || undefined;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  let from: Date | undefined;
  let to: Date | undefined;
  if (fromStr) {
    from = new Date(fromStr);
    if (Number.isNaN(from.getTime())) return fail("INVALID_FROM_DATETIME", 400);
  }
  if (toStr) {
    to = new Date(toStr);
    if (Number.isNaN(to.getTime())) return fail("INVALID_TO_DATETIME", 400);
  }

  const rows = await getRentals({
    userId: session.sub,
    role: session.role,
    carId,
    from,
    to,
  });
  return ok(rows.map(mapRentalRow));
}

export async function getRentalController(id: string) {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);

  try {
    const row = await getRental(id, { userId: session.sub, role: session.role });
    return ok(mapRentalRow(row));
  } catch (error) {
    if (error instanceof RentalError) return fail(error.code, error.statusCode);
    return fail("INTERNAL_ERROR", 500);
  }
}

export async function createRentalController(body: { carId?: string; startTime?: string; endTime?: string }) {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);
  if (!body.carId || !body.startTime || !body.endTime) return fail("INVALID_INPUT", 400);

  try {
    const row = await createRental({
      userId: session.sub,
      carId: body.carId,
      startTime: body.startTime,
      endTime: body.endTime,
    });
    return ok(mapRentalRow(row), 201);
  } catch (error) {
    if (error instanceof RentalError) return fail(error.code, error.statusCode);
    return fail("INTERNAL_ERROR", 500);
  }
}

export async function cancelRentalController(id: string) {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);
  try {
    const result = await cancelRental(id, session.sub, session.role);
    return ok({ id: result.id, status: result.status });
  } catch (error) {
    if (error instanceof RentalError) return fail(error.code, error.statusCode);
    return fail("INTERNAL_ERROR", 500);
  }
}

export async function deleteRentalByAdminController(id: string) {
  const session = await getSessionFromCookies();
  if (!session) return fail("UNAUTHORIZED", 401);
  if (session.role !== "admin") return fail("FORBIDDEN", 403);
  try {
    const result = await deleteRentalByAdmin(id);
    return ok(result);
  } catch (error) {
    if (error instanceof RentalError) return fail(error.code, error.statusCode);
    return fail("INTERNAL_ERROR", 500);
  }
}
