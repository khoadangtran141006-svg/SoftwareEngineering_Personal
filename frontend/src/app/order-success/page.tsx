"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, Check, Coffee, Home, ReceiptText, ShoppingBag } from "lucide-react";
import { getToken } from "@/services/auth";

type OrderDetails = {
  orderCode: string;
  status: string;
  total: number;
  paymentMethod: string | null;
  items: Array<{ quantity: number }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const statusLabels: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  READY: "Sẵn sàng nhận",
  COMPLETED: "Đã hoàn thành",
  PAYMENT_FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy",
};

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}₫`;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get("order");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token || !orderCode) {
      queueMicrotask(() => {
        setError("Không tìm thấy thông tin đơn hàng. Hãy đăng nhập để xem lịch sử đơn.");
        setLoading(false);
      });
      return;
    }

    let active = true;
    fetch(`${API_URL}/orders/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Không thể tải thông tin đơn hàng.");
        const found = (result as OrderDetails[]).find((item) => item.orderCode === orderCode);
        if (!found) throw new Error("Đơn hàng không tồn tại hoặc không thuộc tài khoản này.");
        if (active) setOrder(found);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải thông tin đơn hàng.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [orderCode]);

  const totalItems = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="min-h-screen bg-[#fcfaf7] px-6 py-16 text-[#3f2417] sm:py-24">
      <section className="mx-auto max-w-2xl rounded-[28px] border border-[#eadfd5] bg-white p-7 text-center shadow-[0_18px_55px_rgba(63,36,23,0.08)] sm:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#704329] text-white">
          {loading ? <Coffee size={32} /> : <Check size={38} />}
        </div>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-[#b86f38]">BrewLite</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {loading ? "Đang tải đơn hàng" : error ? "Chưa thể xác nhận đơn" : "Đặt hàng thành công!"}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#704329]/65">
          {error || "Cảm ơn bạn đã đặt hàng. Thông tin bên dưới được lấy từ đơn hàng đã lưu trên hệ thống."}
        </p>

        {order && (
          <div className="mt-8 rounded-2xl bg-[#fcfaf7] p-5 text-left sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eadfd5] pb-4">
              <div>
                <p className="text-xs text-[#704329]/55">Mã đơn hàng</p>
                <p className="mt-1 text-xl font-bold">{order.orderCode}</p>
              </div>
              <span className="rounded-full bg-[#edf6ee] px-3 py-1.5 text-xs font-semibold text-[#3e7145]">
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>
            <div className="grid gap-4 pt-4 sm:grid-cols-3">
              <Summary icon={<ShoppingBag size={16} />} label="Số lượng" value={`${totalItems} món`} />
              <Summary icon={<ReceiptText size={16} />} label="Thanh toán" value={order.paymentMethod || "Chưa thanh toán"} />
              <Summary icon={<Coffee size={16} />} label="Tổng cộng" value={formatPrice(order.total)} />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d9c4b2] px-5 py-3.5 text-sm font-semibold text-[#704329] hover:bg-[#f8f1ea]">
            <ReceiptText size={17} /> Lịch sử đơn hàng <ArrowRight size={15} />
          </Link>
          <Link href="/menu" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#704329] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#5f3824]">
            <ShoppingBag size={17} /> Tiếp tục mua hàng
          </Link>
        </div>
        <Link href="/" className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-[#704329]/55 hover:text-[#704329]">
          <Home size={14} /> Về trang chủ
        </Link>
      </section>
    </main>
  );
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div>
    <div className="flex items-center gap-2 text-xs text-[#704329]/50">{icon}{label}</div>
    <p className="mt-2 text-sm font-bold text-[#3f2417]">{value}</p>
  </div>;
}

export default function OrderSuccessPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Đang tải...</main>}><OrderSuccessContent /></Suspense>;
}
