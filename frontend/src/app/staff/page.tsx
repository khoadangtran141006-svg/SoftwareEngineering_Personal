"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchMe, getToken, type AuthUser } from "@/services/auth";

type StaffStatus = "PAID" | "PREPARING" | "READY";

type StaffOrder = {
  id: number;
  orderCode: string;
  status: StaffStatus;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
  customerName: string | null;
  items: Array<{ id: number; quantity: number; size: string; toppings: string[]; product?: { name: string } }>;
};

const COLUMNS: Array<{ status: StaffStatus; title: string; action: string; next: "PREPARING" | "READY" | "COMPLETED" }> = [
  { status: "PAID", title: "Đơn mới (đã thanh toán)", action: "Nhận đơn", next: "PREPARING" },
  { status: "PREPARING", title: "Đang pha chế", action: "Pha xong", next: "READY" },
  { status: "READY", title: "Sẵn sàng giao khách", action: "Đã giao khách", next: "COMPLETED" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const formatPrice = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export default function StaffPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/orders/staff`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Không thể tải danh sách đơn");
      setOrders(payload);
      setUpdatedAt(new Date());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải danh sách đơn");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchMe().then((me) => {
      if (!active) return;
      setUser(me);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user?.role !== "STAFF") return;
    const initialLoad = window.setTimeout(() => void load(), 0);
    // Làm mới danh sách mỗi 10 giây khi tab đang hiển thị.
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [user, load]);

  async function changeStatus(order: StaffOrder, status: "PREPARING" | "READY" | "COMPLETED" | "CANCELLED") {
    const token = getToken();
    if (!token || busyId) return;
    if (status === "CANCELLED" && !window.confirm(`Hủy đơn ${order.orderCode}? Số lượng sẽ được hoàn lại kho.`)) return;
    setBusyId(order.id);
    try {
      const response = await fetch(`${API_URL}/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Không thể cập nhật trạng thái");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái");
    } finally {
      setBusyId(null);
    }
  }

  if (checking) {
    return <main className="min-h-screen bg-[#fcfaf7] p-10 text-[#704329]">Đang kiểm tra quyền truy cập...</main>;
  }

  if (!getToken() || !user) {
    return (
      <main className="min-h-screen bg-[#fcfaf7] p-10 text-[#3f2417]">
        <p>Vui lòng đăng nhập bằng tài khoản nhân viên.</p>
        <Link href="/login?next=/staff" className="mt-4 inline-block font-semibold text-[#704329] underline">Đăng nhập</Link>
      </main>
    );
  }

  if (user.role !== "STAFF") {
    return <main className="min-h-screen bg-[#fcfaf7] p-10 text-[#3f2417]">Trang này chỉ dành cho nhân viên quầy.</main>;
  }

  return (
    <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Quầy pha chế</h1>
            <p className="mt-1 text-sm text-[#704329]/60">
              {updatedAt ? `Cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN")} · tự làm mới mỗi 10 giây` : "Đang tải..."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-[#dfd0c3] px-4 py-2 text-sm font-semibold text-[#704329] transition hover:bg-[#f8f1ea]"
          >
            Làm mới
          </button>
        </div>

        {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter((order) => order.status === column.status);
            return (
              <section key={column.status} aria-label={column.title} className="rounded-3xl border border-[#eadfd5] bg-white p-4">
                <h2 className="mb-4 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-[#704329]">
                  {column.title}
                  <span className="rounded-full bg-[#f3e9de] px-2.5 py-0.5 text-xs">{columnOrders.length}</span>
                </h2>

                {columnOrders.length === 0 && <p className="py-6 text-center text-sm text-[#704329]/45">Không có đơn</p>}

                <ul className="space-y-3">
                  {columnOrders.map((order) => (
                    <li key={order.id} className="rounded-2xl border border-[#eadfd5] bg-[#fcfaf7] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{order.orderCode}</p>
                          <p className="text-xs text-[#704329]/60">{`${order.customerName ?? "Khách"} · ${formatTime(order.createdAt)}`}</p>
                        </div>
                        <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
                      </div>

                      <ul className="mt-3 space-y-1 text-sm">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {`${item.quantity} × ${item.product?.name ?? "Món"} (${item.size})`}
                            {item.toppings?.length > 0 && <span className="text-[#704329]/60">{` + ${item.toppings.join(", ")}`}</span>}
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => void changeStatus(order, column.next)}
                          className="rounded-xl bg-[#704329] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b3522] disabled:opacity-60"
                        >
                          {column.action}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => void changeStatus(order, "CANCELLED")}
                          className="rounded-xl border border-[#eccaca] px-3 py-2.5 text-sm font-semibold text-[#a33a3a] transition hover:bg-[#fceeee] disabled:opacity-60"
                        >
                          Hủy
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
