"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { quantityInCart, useCartStore } from "@/stores/cart-store";
import { getProducts } from "@/services/products";

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

export default function CartPage() {
  const cartItems = useCartStore((state) => state.items);

  const increaseQuantity = useCartStore(
    (state) => state.increaseQuantity,
  );

  const decreaseQuantity = useCartStore(
    (state) => state.decreaseQuantity,
  );

  const removeItem = useCartStore(
    (state) => state.removeItem,
  );

  const addItem = useCartStore(
    (state) => state.addItem,
  );

  const syncStock = useCartStore((state) => state.syncStock);
  const [stockNotice, setStockNotice] = useState("");

  // Đồng bộ tồn kho mới nhất khi mở giỏ hàng để không giữ số lượng vượt quá hàng còn lại.
  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((products) => {
        if (cancelled) return;
        const stockById = Object.fromEntries(products.map((product) => [product.id, product.stock]));
        if (syncStock(stockById)) {
          setStockNotice("Một số sản phẩm đã được điều chỉnh số lượng theo tồn kho hiện tại.");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [syncStock]);

  const [removedItem, setRemovedItem] = useState<
    (typeof cartItems)[number] | null
  >(null);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + item.unitPrice * item.quantity,
      0,
    );
  }, [cartItems]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
  }, [cartItems]);

  const serviceFee = 0;
  const total = subtotal + serviceFee;

  function handleRemoveItem(
    item: (typeof cartItems)[number],
  ) {
    removeItem(item.cartKey);
    setRemovedItem(item);
  }

  function handleUndoRemove() {
    if (!removedItem) return;

    const { cartKey, ...item } = removedItem;
    void cartKey;

    addItem(item);
    setRemovedItem(null);
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
              Your order
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[#3f2417] sm:text-5xl lg:text-6xl">
              Giỏ hàng của bạn
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#704329]/65 sm:text-base">
              Kiểm tra lại món uống, tùy chỉnh và số lượng
              trước khi tiến hành thanh toán.
            </p>
          </div>
        </div>
      </section>

      {stockNotice && (
        <div role="status" className="mx-auto max-w-7xl px-6 pt-6 sm:px-8 lg:px-10">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {stockNotice}
          </p>
        </div>
      )}

      {/* =========================================================
          REMOVE FEEDBACK
      ========================================================== */}
      {removedItem && (
        <div
          className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-32px)] max-w-md -translate-x-1/2"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#eadfd5] bg-[#3f2417] px-4 py-3.5 text-white shadow-[0_15px_45px_rgba(63,36,23,0.22)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Check size={16} />
            </div>

            <p className="min-w-0 flex-1 truncate text-sm">
              Đã xóa{" "}
              <span className="font-semibold">
                {removedItem.name}
              </span>
            </p>

            <button
              type="button"
              onClick={handleUndoRemove}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/15"
            >
              <Undo2 size={14} />
              Hoàn tác
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          EMPTY CART
      ========================================================== */}
      {cartItems.length === 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-dashed border-[#d9c4b2] bg-[#f8f1ea] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#704329] shadow-sm">
              <ShoppingBag size={26} />
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[#3f2417]">
              Giỏ hàng đang trống
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#704329]/60">
              Hãy chọn một món ngon từ menu BrewLite và
              bắt đầu đơn hàng của bạn.
            </p>

            <Link
              href="/menu"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#704329] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5b3522] hover:shadow-lg hover:shadow-[#704329]/15 active:scale-[0.98]"
            >
              Khám phá menu
              <ArrowLeft
                size={16}
                className="rotate-180"
              />
            </Link>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
            {/* =====================================================
                CART ITEMS
            ====================================================== */}
            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b86f38]">
                    Order items
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#3f2417]">
                    Món đã chọn
                  </h2>
                </div>

                <span className="rounded-full border border-[#eadfd5] bg-white px-3.5 py-2 text-xs font-medium text-[#704329]/60">
                  {totalQuantity}{" "}
                  {totalQuantity === 1 ? "món" : "món"}
                </span>
              </div>

              <div className="space-y-4">
                {cartItems.map((item) => (
                  <article
                    key={item.cartKey}
                    className="overflow-hidden rounded-[24px] border border-[#eadfd5] bg-white shadow-[0_10px_35px_rgba(63,36,23,0.05)] transition-shadow duration-300 hover:shadow-[0_14px_40px_rgba(63,36,23,0.08)]"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex gap-4 sm:gap-5">
                        {/* PRODUCT IMAGE */}
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f1e7dc] sm:h-32 sm:w-32">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 96px, 128px"
                            className="object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </div>

                        {/* PRODUCT INFO */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b86f38]">
                                {item.category}
                              </p>

                              <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#3f2417] sm:text-lg">
                                {item.name}
                              </h3>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveItem(item)
                              }
                              aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#704329]/40 transition hover:bg-[#f8f1ea] hover:text-red-700 active:scale-95"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>

                          {/* SIZE + TOPPINGS */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#f3e9de] px-3 py-1.5 text-xs font-medium text-[#704329]">
                              Size {item.size}
                            </span>

                            {item.toppings.map((topping) => (
                              <span
                                key={topping}
                                className="rounded-full border border-[#eadfd5] bg-[#fcfaf7] px-3 py-1.5 text-xs text-[#704329]/70"
                              >
                                {topping}
                              </span>
                            ))}
                          </div>

                          {/* NOTE */}
                          {item.note && (
                            <div className="mt-3 rounded-xl bg-[#fcfaf7] px-3.5 py-2.5">
                              <p className="text-xs leading-5 text-[#704329]/65">
                                <span className="font-semibold text-[#704329]">
                                  Ghi chú:
                                </span>{" "}
                                {item.note}
                              </p>
                            </div>
                          )}

                          {/* QUANTITY + PRICE */}
                          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* QUANTITY */}
                            <div>
                              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#704329]/40">
                                Số lượng
                              </p>

                              <div className="flex w-fit items-center rounded-xl border border-[#eadfd5] bg-[#fcfaf7] p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    decreaseQuantity(
                                      item.cartKey,
                                    )
                                  }
                                  aria-label={`Giảm số lượng ${item.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#704329] transition hover:bg-white hover:shadow-sm active:scale-95"
                                >
                                  <Minus size={14} />
                                </button>

                                <span
                                  className="min-w-9 text-center text-sm font-semibold text-[#3f2417]"
                                  aria-label={`Số lượng ${item.quantity}`}
                                >
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    increaseQuantity(
                                      item.cartKey,
                                    )
                                  }
                                  disabled={item.quantity >= item.stock - quantityInCart(cartItems, item.id, item.cartKey)}
                                  title={
                                    item.quantity >= item.stock - quantityInCart(cartItems, item.id, item.cartKey)
                                      ? `Chỉ còn ${item.stock} sản phẩm`
                                      : undefined
                                  }
                                  aria-label={`Tăng số lượng ${item.name}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#704329] transition hover:bg-white hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>

                            {/* PRICE */}
                            <div className="text-left sm:text-right">
                              <p className="text-xs text-[#704329]/45">
                                {formatPrice(item.unitPrice)} ×{" "}
                                {item.quantity}
                              </p>

                              <p className="mt-0.5 text-lg font-bold tracking-[-0.03em] text-[#704329]">
                                {formatPrice(
                                  item.unitPrice *
                                    item.quantity,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* CONTINUE SHOPPING */}
              <Link
                href="/menu"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#704329]/70 transition hover:text-[#704329]"
              >
                <ArrowLeft size={17} />
                Tiếp tục xem menu
              </Link>
            </div>

            {/* =====================================================
                ORDER SUMMARY
            ====================================================== */}
            <aside className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-[28px] border border-[#eadfd5] bg-white shadow-[0_15px_45px_rgba(63,36,23,0.08)]">
                {/* SUMMARY HEADER */}
                <div className="bg-[#3f2417] px-6 py-6 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e8a15a]">
                    Order summary
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    Tóm tắt đơn hàng
                  </h2>
                </div>

                <div className="p-6">
                  {/* ITEM COUNT */}
                  <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-[#fcfaf7] px-4 py-3.5">
                    <span className="text-sm text-[#704329]/60">
                      Số lượng món
                    </span>

                    <span className="text-sm font-semibold text-[#3f2417]">
                      {totalQuantity}
                    </span>
                  </div>

                  {/* SUBTOTAL */}
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#704329]/60">
                      Tạm tính
                    </span>

                    <span className="font-medium text-[#3f2417]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {/* SERVICE FEE */}
                  <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#704329]/60">
                      Phí dịch vụ
                    </span>

                    <span className="font-medium text-[#3f2417]">
                      {serviceFee === 0
                        ? "Miễn phí"
                        : formatPrice(serviceFee)}
                    </span>
                  </div>

                  <div className="my-6 h-px bg-[#eadfd5]" />

                  {/* TOTAL */}
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#3f2417]">
                        Tổng cộng
                      </p>

                      <p className="mt-1 text-xs text-[#704329]/45">
                        Đã bao gồm các khoản phí
                      </p>
                    </div>

                    <span className="text-2xl font-bold tracking-[-0.03em] text-[#704329]">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* PAYMENT BUTTON */}
                  <Link
  href="/payment"
  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#704329] px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-[#704329]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#5b3522] hover:shadow-xl hover:shadow-[#704329]/20 active:translate-y-0 active:scale-[0.99]"
>
  Tiến hành thanh toán
  <span
    aria-hidden="true"
    className="text-base"
  >
    →
  </span>
</Link>

                  <p className="mt-4 text-center text-xs leading-5 text-[#704329]/45">
                    Bạn có thể kiểm tra lại đơn hàng trước
                    khi thanh toán.
                  </p>
                </div>
              </div>

              {/* TRUST MESSAGE */}
              <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#704329]/45">
                <ShoppingBag size={14} />
                <span>Đặt hàng nhanh chóng cùng BrewLite</span>
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  );
}
