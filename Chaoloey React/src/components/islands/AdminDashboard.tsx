import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { ApiError, deleteAdminBooking, getAdminDashboard, getMe, login, type AdminDashboardData, type SessionUser } from "../../lib/api";

type DashboardState = {
  loading: boolean;
  error: string;
  data: AdminDashboardData | null;
  me: SessionUser | null;
};

function trendColor(trend: "up" | "down" | "flat") {
  if (trend === "up") return "text-emerald-600";
  if (trend === "down") return "text-rose-600";
  return "text-slate-500";
}

export function AdminDashboard() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: "",
    data: null,
    me: null,
  });
  const [adminEmail, setAdminEmail] = useState("admin@demo.com");
  const [adminPassword, setAdminPassword] = useState("admin123");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [deletingBookingId, setDeletingBookingId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadDashboard = async () => {
    const [me, data] = await Promise.all([getMe(), getAdminDashboard()]);
    setState({
      loading: false,
      error: "",
      data,
      me,
    });
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [me, data] = await Promise.all([getMe(), getAdminDashboard()]);
        if (!active) return;
        setState({
          loading: false,
          error: "",
          data,
          me,
        });
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setState((prev) => ({ ...prev, loading: false, error: "Please sign in first." }));
            return;
          }
          if (err.status === 403) {
            setState((prev) => ({ ...prev, loading: false, error: "Admin access only." }));
            return;
          }
          setState((prev) => ({ ...prev, loading: false, error: err.code }));
          return;
        }
        setState((prev) => ({ ...prev, loading: false, error: "Failed to load dashboard" }));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) return;
    setLoggingIn(true);
    setLoginError("");

    try {
      const signedIn = await login(adminEmail.trim(), adminPassword);
      if (signedIn.role !== "admin") {
        setLoginError("This account is not admin.");
        return;
      }
      await loadDashboard();
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(err.code);
      } else {
        setLoginError("Login failed");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const confirmed = window.confirm("Delete this booking? This action cannot be undone.");
    if (!confirmed) return;

    setDeletingBookingId(bookingId);
    setActionMessage("");

    try {
      await deleteAdminBooking(bookingId);
      setActionMessage("Booking deleted.");
      await loadDashboard();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "BOOKING_LOCKED_BY_TIME") {
          setActionMessage("Cannot delete booking after pickup time has started.");
        } else {
          setActionMessage(err.code);
        }
      } else {
        setActionMessage("Failed to delete booking.");
      }
    } finally {
      setDeletingBookingId("");
    }
  };

  const chartMax = useMemo(() => {
    if (!state.data) return 1;
    const max = Math.max(...state.data.trend.map((item) => item.bookings), 1);
    return max;
  }, [state.data]);

  if (state.loading) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] p-6 text-slate-900">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 shadow-sm">Loading dashboard...</div>
      </main>
    );
  }

  if (state.error || !state.data) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] p-6 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-2xl border border-rose-100 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-[#071c45]">Admin Dashboard</h1>
          <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error || "No dashboard data"}</p>

          <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Admin email
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => void handleAdminLogin()}
                disabled={loggingIn}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loggingIn ? "Signing in..." : "Sign in as admin"}
              </button>
              <a href="/api/auth/google/start?next=/admin" className="ml-3 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign in with Google
              </a>
              {loginError && <p className="mt-2 text-sm font-medium text-rose-700">{loginError}</p>}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 p-4 md:grid-cols-[240px,1fr] md:p-6">
        <aside className="rounded-2xl bg-[#0b1738] p-5 text-slate-100">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">ChaoLoey</p>
          <h1 className="mt-2 text-2xl font-black">Dashboard</h1>
          <div className="mt-8 space-y-2 text-sm">
            <p className="rounded-lg bg-white/10 px-3 py-2">Overview</p>
            <p className="rounded-lg px-3 py-2 text-slate-300">Today Schedule</p>
            <p className="rounded-lg px-3 py-2 text-slate-300">Upcoming</p>
          </div>
          <p className="mt-8 text-xs text-slate-300">Signed in as</p>
          <p className="text-sm font-semibold">{state.me?.email}</p>
          <a href="/" className="mt-6 inline-block rounded-lg border border-slate-500 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">
            Back to landing
          </a>
        </aside>

        <section className="space-y-6">
          <header className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-3xl font-black text-[#071c45]">Operation Summary</h2>
            <p className="mt-1 text-sm text-slate-500">{format(new Date(), "dd MMM yyyy HH:mm")} (local server time)</p>
            {actionMessage && <p className="mt-3 text-sm font-medium text-blue-700">{actionMessage}</p>}
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {state.data.cards.map((card) => (
              <article key={card.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-3 text-3xl font-black text-[#071c45]">{card.value}</p>
                <p className={`mt-2 text-xs font-semibold ${trendColor(card.trend)}`}>{card.deltaText}</p>
              </article>
            ))}
          </div>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-[#071c45]">Last 7 days trend</h3>
              <p className="text-xs text-slate-500">Bookings per day</p>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {state.data.trend.map((item) => (
                <div key={item.date} className="flex flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded bg-slate-100 p-1">
                    <div
                      className="w-full rounded bg-blue-600"
                      style={{ height: `${Math.max(8, Math.round((item.bookings / chartMax) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">{format(new Date(item.date), "dd/MM")}</p>
                  <p className="text-[11px] text-slate-700">{item.bookings} bk</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-[#071c45]">Today's appointments</h3>
            {state.data.todayAppointments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No customer appointment today.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Car</th>
                      <th className="px-4 py-3">Pick-up</th>
                      <th className="px-4 py-3">Return</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.todayAppointments.map((row) => (
                      <tr key={row.bookingId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-blue-700">{row.bookingId}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.customerName}</p>
                          <p className="text-xs text-slate-500">{row.customerEmail}</p>
                        </td>
                        <td className="px-4 py-3">{row.carName}</td>
                        <td className="px-4 py-3">{format(new Date(row.pickupAt), "dd MMM HH:mm")}</td>
                        <td className="px-4 py-3">{format(new Date(row.returnAt), "dd MMM HH:mm")}</td>
                        <td className="px-4 py-3">{row.pickupLocation}</td>
                        <td className="px-4 py-3">{row.amount.toLocaleString()} Baht</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteBooking(row.bookingId)}
                            disabled={deletingBookingId === row.bookingId}
                            className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingBookingId === row.bookingId ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-[#071c45]">Upcoming customer schedule</h3>
            {state.data.upcomingAppointments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No upcoming schedule.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {state.data.upcomingAppointments.slice(0, 8).map((row) => (
                  <li key={`up-${row.bookingId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{row.customerName} · {row.carName}</p>
                      <p className="text-xs font-semibold text-blue-700">{row.bookingId}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {format(new Date(row.pickupAt), "dd MMM yyyy HH:mm")} - {format(new Date(row.returnAt), "dd MMM yyyy HH:mm")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{row.pickupLocation}</p>
                    <button
                      type="button"
                      onClick={() => void handleDeleteBooking(row.bookingId)}
                      disabled={deletingBookingId === row.bookingId}
                      className="mt-3 rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingBookingId === row.bookingId ? "Deleting..." : "Delete booking"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
