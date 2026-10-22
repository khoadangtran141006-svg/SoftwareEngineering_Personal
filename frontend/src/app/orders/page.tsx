"use client";

import Link from "next/link";
import { useOrdersStore } from "@/stores/orders-store";

import {
  ArrowRight,
  Check,
  Clock3,
  Coffee,
  Eye,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getToken } from "@/services/auth";

import type {
  Order,
  OrderStatus,
} from "@/stores/orders-store";

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function getTotalQuantity(order: Order) {
  return order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
}

function formatOrderDate(createdAt: string) {
  const date = new Date(createdAt);

  return {
    date: date.toLocaleDateString("vi-VN"),
    time: date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function getStatusInfo(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return {
        label: "Chờ thanh toán",
        description: "Đơn hàng đang chờ thanh toán. Đơn sẽ tự hủy nếu quá 15 phút chưa thanh toán.",
        icon: Clock3,
        className: "bg-[#fff4e6] text-[#a55d22] border-[#f1d7bb]",
      };

    case "PAYMENT_FAILED":
      return {
        label: "Thanh toán thất bại",
        description: "Vui lòng thử lại thanh toán, hoặc hủy đơn. Đơn sẽ tự hủy nếu quá 15 phút chưa thanh toán.",
        icon: XCircle,
        className: "bg-[#fceeee] text-[#a33a3a] border-[#eccaca]",
      };
    case "PAID":
      return {
        label: "Đã thanh toán",
        description: "Đơn hàng đã được xác nhận",
        icon: Check,
        className:
          "bg-[#f3e9de] text-[#704329] border-[#eadfd5]",
      };

    case "PREPARING":
      return {
        label: "Đang chuẩn bị",
        description: "Barista đang chuẩn bị đơn hàng",
        icon: Clock3,
        className:
          "bg-[#fff4e6] text-[#a55d22] border-[#f1d7bb]",
      };

    case "READY":
      return {
        label: "Sẵn sàng nhận",
        description: "Đơn hàng đã sẵn sàng để nhận",
        icon: PackageCheck,
        className:
          "bg-[#edf6ee] text-[#3e7145] border-[#cfe2d1]",
      };

    case "COMPLETED":
      return {
        label: "Hoàn thành",
        description: "Đơn hàng đã hoàn tất",
        icon: Check,
        className:
          "bg-[#edf6ee] text-[#3e7145] border-[#cfe2d1]",
      };

    case "CANCELLED":
      return {
        label: "Đã huỷ",
        description: "Đơn hàng đã được huỷ",
        icon: XCircle,
        className:
          "bg-[#fceeee] text-[#a33a3a] border-[#eccaca]",
      };
  }
}

export default function OrdersPage() {
  /*
   * =========================================================
   * ORDERS STORE
   * =========================================================
   *
   * Không còn sử dụng mockOrders.
   * Dữ liệu được lấy trực tiếp từ Zustand + localStorage.
   */
  const orders = useOrdersStore((state) => state.orders);
  const setOrders = useOrdersStore((state) => state.setOrders);
  const [loadError, setLoadError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    let stopped = false;
    const load = () => fetch(`${apiUrl}/orders/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Không thể tải lịch sử đơn hàng");
        if (stopped) return;
        setLoadError("");
        setOrders(payload.map((order: { id: number; orderCode: string; status: OrderStatus; total: number; createdAt: string; paymentMethod: string | null; items: Array<{ id: number; quantity: number; size: string; lineTotal: number; toppings: string[]; product: { id: number; name: string; category: string; imageUrl: string } }> }) => ({
          id: order.orderCode,
          dbId: order.id,
          createdAt: order.createdAt,
          status: order.status,
          paymentMethod: (["Ví điện tử", "Thẻ ngân hàng"] as const).find((method) => method === order.paymentMethod) ?? "QR Code",
          items: order.items.map((item) => ({ id: item.id, name: item.product.name, image: item.product.imageUrl, category: item.product.category, size: item.size, toppings: item.toppings ?? [], note: "", unitPrice: Math.floor(item.lineTotal / item.quantity), quantity: item.quantity })),
          totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
          total: order.total,
        })));
      })
      .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause.message : "Không thể tải lịch sử"));

    void load();
    // Tự cập nhật trạng thái đơn (PAID → PREPARING → READY...) mỗi 15 giây khi tab đang hiển thị.
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [setOrders]);

  async function cancelOrder(order: Order) {
    const token = getToken();
    if (!token || !order.dbId || cancellingId) return;
    if (!window.confirm(`Bạn có chắc muốn hủy đơn ${order.id}?`)) return;

    setCancelError("");
    setCancellingId(order.id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const response = await fetch(`${apiUrl}/orders/${order.dbId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message ?? "Không thể hủy đơn hàng");
      setOrders(orders.map((current) => (current.id === order.id ? { ...current, status: "CANCELLED" } : current)));
    } catch (cause) {
      setCancelError(cause instanceof Error ? cause.message : "Không thể hủy đơn hàng");
    } finally {
      setCancellingId(null);
    }
  }

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [activeFilter, setActiveFilter] = useState<
    "ALL" | OrderStatus
  >("ALL");

  /*
   * =========================================================
   * FILTER ORDERS
   * =========================================================
   */
  const filteredOrders =
    activeFilter === "ALL"
      ? orders
      : orders.filter(
          (order) => order.status === activeFilter,
        );

  /*
   * =========================================================
   * FORMAT ORDER DATE
   * =========================================================
   */
  function getOrderDateInfo(createdAt: string) {
    return formatOrderDate(createdAt);
  }

  return (
    <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
      {/* =========================================================
          PAGE HEADER
      ========================================================== */}
      <section className="border-b border-[#eadfd5] bg-[#f3e9de]">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b86f38]">
              Order history
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[#3f2417] sm:text-5xl lg:text-6xl">
              Lịch sử đơn hàng
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#704329]/65 sm:text-base">
              Theo dõi những đơn hàng bạn đã đặt và xem
              lại chi tiết từng đơn hàng tại BrewLite.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        {loadError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
        {cancelError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{cancelError}</p>}
        {/* =======================================================
            TOP BAR
        ======================================================== */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b86f38]">
              Your orders
            </p>

            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#3f2417]">
                Đơn hàng của bạn
              </h2>

              <span className="rounded-full border border-[#eadfd5] bg-white px-3 py-1.5 text-xs font-semibold text-[#704329]/60">
                {orders.length} đơn
              </span>
            </div>
          </div>

          <Link
            href="/menu"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d9c4b2] bg-white px-5 py-3 text-sm font-semibold text-[#704329] transition hover:border-[#704329]/30 hover:bg-[#f8f1ea]"
          >
            Đặt món mới
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* =======================================================
            FILTERS
        ======================================================== */}
        <div className="mt-7 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {[
              {
                key: "ALL",
                label: "Tất cả",
              },
              {
                key: "PAID",
                label: "Đã thanh toán",
              },
              {
                key: "PREPARING",
                label: "Đang chuẩn bị",
              },
              {
                key: "READY",
                label: "Sẵn sàng nhận",
              },
              {
                key: "COMPLETED",
                label: "Hoàn thành",
              },
              {
                key: "CANCELLED",
                label: "Đã huỷ",
              },
            ].map((filter) => {
              const isActive =
                activeFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setActiveFilter(
                      filter.key as
                        | "ALL"
                        | OrderStatus,
                    )
                  }
                  className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-[#704329] bg-[#704329] text-white shadow-sm"
                      : "border-[#eadfd5] bg-white text-[#704329]/60 hover:border-[#d9c4b2] hover:text-[#704329]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* =======================================================
            EMPTY STATE
        ======================================================== */}
        {filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-[#d9c4b2] bg-[#f8f1ea] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#704329] shadow-sm">
              <ShoppingBag size={26} />
            </div>

            <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[#3f2417]">
              {orders.length === 0
                ? "Chưa có đơn hàng"
                : "Không có đơn hàng"}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#704329]/60">
              {orders.length === 0
                ? "Bạn chưa có đơn hàng nào. Hãy khám phá menu và đặt món đầu tiên."
                : "Bạn chưa có đơn hàng nào thuộc trạng thái này."}
            </p>

            {activeFilter !== "ALL" ? (
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#704329] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5b3522]"
              >
                <RefreshCw size={16} />
                Xem tất cả đơn hàng
              </button>
            ) : (
              <Link
                href="/menu"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#704329] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5b3522]"
              >
                Khám phá menu
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          /* =======================================================
             ORDER LIST
          ======================================================== */
          <div className="mt-8 space-y-5">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(
                order.status,
              );

              const StatusIcon = statusInfo.icon;

              const totalQuantity =
                getTotalQuantity(order);

              const { date, time } =
                getOrderDateInfo(order.createdAt);

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-[26px] border border-[#eadfd5] bg-white shadow-[0_10px_35px_rgba(63,36,23,0.05)] transition duration-300 hover:shadow-[0_16px_45px_rgba(63,36,23,0.08)]"
                >
                  {/* =================================================
                      ORDER TOP
                  ================================================== */}
                  <div className="flex flex-col gap-4 border-b border-[#eadfd5] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3e9de] text-[#704329]">
                        <Coffee size={20} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold tracking-[-0.02em] text-[#3f2417]">
                            {order.id}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusInfo.className}`}
                          >
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs text-[#704329]/45">
                          {date} · {time}
                        </p>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#704329]/35">
                        Tổng đơn
                      </p>

                      <p className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#704329]">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>

                  {/* =================================================
                      ORDER BODY
                  ================================================== */}
                  <div className="px-5 py-5 sm:px-6">
                    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                      {/* ITEMS */}
                      <div>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#704329]/40">
                          Món đã đặt
                        </p>

                        <div className="space-y-3">
                          {order.items.map(
                            (item, itemIndex) => (
                              <div
                                key={`${order.id}-${item.id}-${itemIndex}`}
                                className="flex items-center justify-between gap-4 rounded-2xl bg-[#fcfaf7] px-4 py-3"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-[#704329] shadow-sm">
                                    {item.quantity}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#3f2417]">
                                      {item.name}
                                    </p>

                                    <p className="mt-0.5 text-xs text-[#704329]/45">
                                      Size {item.size}

                                      {item.toppings.length >
                                        0 &&
                                        ` · ${item.toppings.length} topping`}
                                    </p>
                                  </div>
                                </div>

                                <span className="shrink-0 text-sm font-semibold text-[#704329]">
                                  {formatPrice(
                                    item.unitPrice *
                                      item.quantity,
                                  )}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* META */}
                      <div className="lg:min-w-55">
                        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-[#704329]/45">
                              Số lượng
                            </span>

                            <span className="font-semibold text-[#3f2417]">
                              {totalQuantity} món
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                            <span className="text-[#704329]/45">
                              Thanh toán
                            </span>

                            <span className="font-semibold text-[#3f2417]">
                              {order.paymentMethod}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                            <span className="text-[#704329]/45">
                              Trạng thái
                            </span>

                            <span className="font-semibold text-[#704329]">
                              {statusInfo.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOrder(order)
                            }
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#704329] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#5b3522] active:scale-[0.98]"
                          >
                            <Eye size={15} />
                            Xem chi tiết
                          </button>

                          {(order.status === "PENDING" || order.status === "PAYMENT_FAILED") && order.dbId && (
                            <button
                              type="button"
                              onClick={() => void cancelOrder(order)}
                              disabled={cancellingId === order.id}
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#eccaca] px-4 py-3 text-xs font-semibold text-[#a33a3a] transition hover:bg-[#fceeee] active:scale-[0.98] disabled:opacity-60"
                            >
                              <XCircle size={15} />
                              {cancellingId === order.id ? "Đang hủy..." : "Hủy đơn"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* STATUS DESCRIPTION */}
                    <div className="mt-5 flex items-center gap-2 border-t border-[#eadfd5] pt-4 text-xs text-[#704329]/50">
                      <StatusIcon
                        size={14}
                        className="shrink-0"
                      />
                      <span>{statusInfo.description}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* =========================================================
            FOOTER NOTE
        ========================================================== */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#eadfd5] bg-[#f8f1ea] px-5 py-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#704329]">
              <ShoppingBag size={16} />
            </div>

            <div>
              <p className="text-xs font-semibold text-[#3f2417]">
                Muốn đặt thêm?
              </p>

              <p className="mt-0.5 text-[11px] text-[#704329]/45">
                Khám phá menu và tạo đơn hàng mới.
              </p>
            </div>
          </div>

          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#704329] transition hover:text-[#b86f38]"
          >
            Xem menu
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* =========================================================
          ORDER DETAIL MODAL
      ========================================================== */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-[#3f2417]/45 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#eadfd5] bg-white shadow-[0_30px_90px_rgba(63,36,23,0.2)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* MODAL HEADER */}
            <div className="bg-[#3f2417] px-6 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e8a15a]">
                    Order detail
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                    {selectedOrder.id}
                  </h2>

                  <p className="mt-1 text-xs text-white/45">
                    {formatOrderDate(
                      selectedOrder.createdAt,
                    ).date}{" "}
                    ·{" "}
                    {formatOrderDate(
                      selectedOrder.createdAt,
                    ).time}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedOrder(null)
                  }
                  aria-label="Đóng chi tiết đơn hàng"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* STATUS */}
              {(() => {
                const statusInfo = getStatusInfo(
                  selectedOrder.status,
                );

                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${statusInfo.className}`}
                  >
                    <StatusIcon size={18} />

                    <div>
                      <p className="text-sm font-semibold">
                        {statusInfo.label}
                      </p>

                      <p className="mt-0.5 text-xs opacity-70">
                        {statusInfo.description}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* ITEMS */}
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#704329]/40">
                  Chi tiết món
                </p>

                <div className="mt-3 space-y-3">
                  {selectedOrder.items.map(
                    (item, itemIndex) => (
                      <div
                        key={`${selectedOrder.id}-detail-${item.id}-${itemIndex}`}
                        className="flex items-center justify-between gap-4 rounded-2xl bg-[#fcfaf7] px-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#3f2417]">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-[#704329]/45">
                            Size {item.size} ·{" "}
                            {item.quantity} món
                          </p>

                          {item.toppings.length > 0 && (
                            <p className="mt-1 text-xs text-[#704329]/40">
                              Topping:{" "}
                              {item.toppings.join(", ")}
                            </p>
                          )}

                          {item.note && (
                            <p className="mt-1 text-xs text-[#704329]/40">
                              Ghi chú: {item.note}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-sm font-semibold text-[#704329]">
                          {formatPrice(
                            item.unitPrice *
                              item.quantity,
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* SUMMARY */}
              <div className="my-6 h-px bg-[#eadfd5]" />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#704329]/55">
                    Số lượng
                  </span>

                  <span className="font-semibold text-[#3f2417]">
                    {getTotalQuantity(
                      selectedOrder,
                    )}{" "}
                    món
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#704329]/55">
                    Phương thức thanh toán
                  </span>

                  <span className="font-semibold text-[#3f2417]">
                    {selectedOrder.paymentMethod}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-[#3f2417]">
                    Tổng cộng
                  </span>

                  <span className="text-2xl font-bold tracking-[-0.03em] text-[#704329]">
                    {formatPrice(
                      selectedOrder.total,
                    )}
                  </span>
                </div>
              </div>

              {/* CLOSE */}
              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl border border-[#d9c4b2] bg-white text-sm font-semibold text-[#704329] transition hover:bg-[#f8f1ea]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
