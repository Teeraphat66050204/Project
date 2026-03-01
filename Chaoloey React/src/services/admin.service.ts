import { db } from "@/lib/db";

type Trend = "up" | "down" | "flat";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDelta(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { deltaText: "No change", trend: "flat" as Trend };
    return { deltaText: "New activity", trend: "up" as Trend };
  }
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 0.1) return { deltaText: "No change", trend: "flat" as Trend };
  return {
    deltaText: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs yesterday`,
    trend: delta > 0 ? ("up" as Trend) : ("down" as Trend),
  };
}

function mapAppointmentRow(item: {
  id: string;
  status: string;
  startTime: Date;
  endTime: Date;
  user: { name: string; email: string };
  room: { name: string };
  confirmation: { amount: number; pickupLocation: string | null } | null;
}) {
  return {
    bookingId: item.id,
    customerName: item.user.name,
    customerEmail: item.user.email,
    carName: item.room.name,
    pickupAt: item.startTime.toISOString(),
    returnAt: item.endTime.toISOString(),
    pickupLocation: item.confirmation?.pickupLocation ?? "-",
    status: item.status,
    amount: item.confirmation?.amount ?? 0,
  };
}

export async function getAdminDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const [
    todayPickups,
    yesterdayPickups,
    todayReturns,
    yesterdayReturns,
    activeHolds,
    todayRevenueAgg,
    yesterdayRevenueAgg,
    todayAppointmentsRaw,
    upcomingAppointmentsRaw,
  ] = await Promise.all([
    db.booking.count({ where: { status: "CONFIRMED", startTime: { gte: todayStart, lt: tomorrowStart } } }),
    db.booking.count({ where: { status: "CONFIRMED", startTime: { gte: yesterdayStart, lt: todayStart } } }),
    db.booking.count({ where: { status: "CONFIRMED", endTime: { gte: todayStart, lt: tomorrowStart } } }),
    db.booking.count({ where: { status: "CONFIRMED", endTime: { gte: yesterdayStart, lt: todayStart } } }),
    db.bookingHold.count({ where: { expiresAt: { gt: now } } }),
    db.bookingConfirmation.aggregate({
      _sum: { amount: true },
      where: {
        booking: {
          startTime: { gte: todayStart, lt: tomorrowStart },
          status: "CONFIRMED",
        },
      },
    }),
    db.bookingConfirmation.aggregate({
      _sum: { amount: true },
      where: {
        booking: {
          startTime: { gte: yesterdayStart, lt: todayStart },
          status: "CONFIRMED",
        },
      },
    }),
    db.booking.findMany({
      where: { status: "CONFIRMED", startTime: { gte: todayStart, lt: tomorrowStart } },
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { name: true } },
        confirmation: { select: { amount: true, pickupLocation: true } },
      },
      orderBy: { startTime: "asc" },
      take: 20,
    }),
    db.booking.findMany({
      where: { status: "CONFIRMED", startTime: { gte: now } },
      include: {
        user: { select: { name: true, email: true } },
        room: { select: { name: true } },
        confirmation: { select: { amount: true, pickupLocation: true } },
      },
      orderBy: { startTime: "asc" },
      take: 20,
    }),
  ]);

  const todayRevenue = todayRevenueAgg._sum.amount ?? 0;
  const yesterdayRevenue = yesterdayRevenueAgg._sum.amount ?? 0;

  const pickupDelta = formatDelta(todayPickups, yesterdayPickups);
  const returnDelta = formatDelta(todayReturns, yesterdayReturns);
  const revenueDelta = formatDelta(todayRevenue, yesterdayRevenue);

  const cards = [
    { id: "pickup", label: "Today's Pick-ups", value: todayPickups.toLocaleString(), deltaText: pickupDelta.deltaText, trend: pickupDelta.trend },
    { id: "return", label: "Today's Returns", value: todayReturns.toLocaleString(), deltaText: returnDelta.deltaText, trend: returnDelta.trend },
    { id: "revenue", label: "Revenue Today", value: `${todayRevenue.toLocaleString()} Baht`, deltaText: revenueDelta.deltaText, trend: revenueDelta.trend },
    { id: "hold", label: "Active Holds", value: activeHolds.toLocaleString(), deltaText: activeHolds > 0 ? "Pending checkout sessions" : "No active hold", trend: activeHolds > 0 ? ("up" as Trend) : ("flat" as Trend) },
  ];

  const trend: Array<{ date: string; bookings: number; revenue: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = addDays(todayStart, -i);
    const dayEnd = addDays(dayStart, 1);
    const [count, revenue] = await Promise.all([
      db.booking.count({
        where: {
          status: "CONFIRMED",
          startTime: { gte: dayStart, lt: dayEnd },
        },
      }),
      db.bookingConfirmation.aggregate({
        _sum: { amount: true },
        where: {
          booking: {
            startTime: { gte: dayStart, lt: dayEnd },
            status: "CONFIRMED",
          },
        },
      }),
    ]);
    trend.push({
      date: dayStart.toISOString(),
      bookings: count,
      revenue: revenue._sum.amount ?? 0,
    });
  }

  return {
    cards,
    todayAppointments: todayAppointmentsRaw.map(mapAppointmentRow),
    upcomingAppointments: upcomingAppointmentsRaw.map(mapAppointmentRow),
    trend,
  };
}
