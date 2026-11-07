"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";

import { getProductById } from "@/services/products";
import type { Product } from "@/types/product";
import { quantityInCart, useCartStore } from "@/stores/cart-store";
import { animateProductToCart } from "@/lib/cart-animation";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SizeOption = {
  id: "S" | "M" | "L";
  label: string;
  extraPrice: number;
};

type ToppingOption = {
  id: string;
  name: string;
  price: number;
};

const sizeOptions: SizeOption[] = [
  {
    id: "S",
    label: "S",
    extraPrice: 0,
  },
  {
    id: "M",
    label: "M",
    extraPrice: 5000,
  },
  {
    id: "L",
    label: "L",
    extraPrice: 10000,
  },
];

const toppingOptions: ToppingOption[] = [
  {
    id: "tran-chau",
    name: "Trân châu",
    price: 5000,
  },
  {
    id: "kem-cheese",
    name: "Kem cheese",
    price: 8000,
  },
  {
    id: "espresso",
    name: "Espresso",
    price: 10000,
  },
];

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function getCategoryName(category: Product["category"]) {
  const categoryMap: Record<Product["category"], string> = {
    coffee: "Cà phê",
    tea: "Trà",
    "milk-tea": "Trà sữa",
  };

  return categoryMap[category];
}

export default function ProductDetailPage({
  params,
}: ProductPageProps) {
  const { id } = use(params);

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const [stockNotice, setStockNotice] = useState("");

  const [product, setProduct] = useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSize, setSelectedSize] =
    useState<SizeOption["id"]>("M");

  const [selectedToppings, setSelectedToppings] =
    useState<string[]>([]);

  const [quantity, setQuantity] = useState(1);

  const [note, setNote] = useState("");

  const [isAddingToCart, setIsAddingToCart] =
    useState(false);

  const [showAddedMessage, setShowAddedMessage] =
    useState(false);

  // =========================================================
  // LOAD PRODUCT FROM BACKEND
  // =========================================================

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const productId = Number(id);

        if (!Number.isInteger(productId) || productId <= 0) {
          throw new Error("ID sản phẩm không hợp lệ");
        }

        const data = await getProductById(productId);

        setProduct(data);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Không thể tải thông tin sản phẩm");
        }
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  // =========================================================
  // SIZE PRICE
  // =========================================================

  const selectedSizeOption = useMemo(() => {
    return (
      sizeOptions.find(
        (size) => size.id === selectedSize,
      ) ?? sizeOptions[1]
    );
  }, [selectedSize]);

  // =========================================================
  // TOPPING PRICE
  // =========================================================

  const selectedToppingTotal = useMemo(() => {
    return toppingOptions
      .filter((topping) =>
        selectedToppings.includes(topping.id),
      )
      .reduce(
        (total, topping) => total + topping.price,
        0,
      );
  }, [selectedToppings]);

  // =========================================================
  // PRICE
  // =========================================================

  const basePrice = product?.price ?? 0;

  const unitPrice =
    basePrice +
    selectedSizeOption.extraPrice +
    selectedToppingTotal;

  const totalPrice = unitPrice * quantity;

  // =========================================================
  // TOPPING
  // =========================================================

  function toggleTopping(toppingId: string) {
    setSelectedToppings((current) => {
      if (current.includes(toppingId)) {
        return current.filter(
          (id) => id !== toppingId,
        );
      }

      return [...current, toppingId];
    });
  }

  // =========================================================
  // QUANTITY
  // =========================================================

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1),
    );
  }

  function increaseQuantity() {
    setQuantity((current) => {
      if (!product) {
        return current;
      }

      const maxQuantity = Math.max(0, product.stock - quantityInCart(cartItems, product.id));
      return Math.min(maxQuantity, current + 1);
    });
  }

  // =========================================================
  // ADD TO CART
  // =========================================================

  function handleAddToCart() {
    if (!product || isAddingToCart) {
      return;
    }

    setIsAddingToCart(true);
    setShowAddedMessage(false);

    const selectedToppingNames = toppingOptions
      .filter((topping) =>
        selectedToppings.includes(topping.id),
      )
      .map((topping) => topping.name);

    const result = addItem({
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.imageUrl,
      size: selectedSize,
      toppings: selectedToppingNames,
      note: note.trim(),
      unitPrice,
      quantity,
      stock: product.stock,
    });

    setQuantity(1);
    setStockNotice(
      result.added === 0
        ? `Bạn đã thêm tối đa ${product.stock} sản phẩm còn lại vào giỏ hàng.`
        : result.limited
          ? `Chỉ còn ${product.stock} sản phẩm nên mình đã thêm ${result.added} sản phẩm vào giỏ.`
          : "",
    );

    if (result.added === 0) {
      setIsAddingToCart(false);
      return;
    }

    animateProductToCart(product.imageUrl);

    window.setTimeout(() => {
      setIsAddingToCart(false);
      setShowAddedMessage(true);
    }, 500);

    window.setTimeout(() => {
      setShowAddedMessage(false);
    }, 2200);
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
        <div className="mx-auto flex min-h-[650px] max-w-7xl items-center justify-center px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col items-center gap-4 text-[#704329]">
            <Loader2
              size={34}
              className="animate-spin"
            />

            <p className="text-sm font-medium">
              Đang tải sản phẩm...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
        <div className="mx-auto flex min-h-[650px] max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-[#eadfd5] bg-white p-8 text-center shadow-[0_18px_55px_rgba(63,36,23,0.08)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3e9de] text-[#704329]">
              <ShoppingCart size={28} />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#b86f38]">
              Product unavailable
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
              Không tìm thấy sản phẩm
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#704329]/60">
              {error ||
                "Sản phẩm bạn đang tìm kiếm không tồn tại."}
            </p>

            <Link
              href="/menu"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#704329] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5f3824]"
            >
              <ArrowLeft size={16} />
              Quay lại Menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
      {/* =====================================================
          HEADER / BREADCRUMB
      ====================================================== */}
      <section className="border-b border-[#eadfd5] bg-[#f3e9de]">
        <div className="mx-auto max-w-7xl px-6 py-6 sm:px-8 lg:px-10">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#704329]/60 transition hover:text-[#704329]"
          >
            <ArrowLeft size={15} />
            Quay lại Menu
          </Link>
        </div>
      </section>

      {/* =====================================================
          PRODUCT
      ====================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          {/* =================================================
              IMAGE
          ================================================== */}
          <div className="lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-[32px] border border-[#eadfd5] bg-white shadow-[0_18px_55px_rgba(63,36,23,0.08)]">
              <div className="relative aspect-square overflow-hidden bg-[#f3e9de]">
                <Image
                  data-product-hero-image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* =================================================
              DETAILS
          ================================================== */}
          <div className="rounded-[32px] border border-[#eadfd5] bg-white p-6 shadow-[0_18px_55px_rgba(63,36,23,0.08)] sm:p-8 lg:p-10">
            {/* CATEGORY */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b86f38]">
              {getCategoryName(product.category)}
            </p>

            {/* NAME */}
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#3f2417] sm:text-4xl">
              {product.name}
            </h1>

            {/* DESCRIPTION */}
            <p className="mt-4 text-sm leading-7 text-[#704329]/60">
              Thưởng thức {product.name.toLowerCase()} được pha chế
              theo phong cách BrewLite, phù hợp cho những khoảnh
              khắc thư giãn trong ngày.
            </p>

            {/* BASE PRICE */}
            <div className="mt-5 text-2xl font-bold text-[#704329]">
              {formatPrice(product.price)}
            </div>

            {/* STOCK */}
            <div className="mt-3 flex items-center gap-2 text-xs text-[#704329]/50">
              <span
                className={`h-2 w-2 rounded-full ${
                  product.stock > 0
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />

              {product.stock > 0
                ? `Còn ${product.stock} sản phẩm${
                    quantityInCart(cartItems, product.id) > 0
                      ? ` (đã có ${quantityInCart(cartItems, product.id)} trong giỏ)`
                      : ""
                  }`
                : "Hết hàng"}
            </div>

            <div className="my-8 h-px bg-[#eadfd5]" />

            {/* =================================================
                SIZE + TOPPING
            ================================================== */}
            <div className="grid gap-8 sm:grid-cols-2">
              {/* SIZE */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#3f2417]">
                    Kích thước
                  </h2>

                  <span className="text-xs text-[#704329]/50">
                    Chọn 1
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {sizeOptions.map((size) => {
                    const active =
                      selectedSize === size.id;

                    const sizePrice =
                      product.price + size.extraPrice;

                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() =>
                          setSelectedSize(size.id)
                        }
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                          active
                            ? "border-[#704329] bg-[#704329] text-white shadow-md shadow-[#704329]/15"
                            : "border-[#eadfd5] bg-white text-[#3f2417] hover:border-[#c9ad97] hover:bg-[#f8f1ea]"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              active
                                ? "bg-white/15 text-white"
                                : "bg-[#f3e9de] text-[#704329]"
                            }`}
                          >
                            {active ? (
                              <Check size={14} />
                            ) : (
                              size.label
                            )}
                          </span>

                          <span className="text-sm font-semibold">
                            Size {size.label}
                          </span>
                        </span>

                        <span
                          className={`text-sm font-bold ${
                            active
                              ? "text-[#f6d5ae]"
                              : "text-[#704329]"
                          }`}
                        >
                          {formatPrice(sizePrice)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOPPING */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#3f2417]">
                    Topping
                  </h2>

                  <span className="text-xs text-[#704329]/50">
                    Có thể chọn nhiều
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white">
                  {toppingOptions.map(
                    (topping, index) => {
                      const active =
                        selectedToppings.includes(
                          topping.id,
                        );

                      return (
                        <button
                          key={topping.id}
                          type="button"
                          onClick={() =>
                            toggleTopping(
                              topping.id,
                            )
                          }
                          className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition ${
                            index > 0
                              ? "border-t border-[#f0e7df]"
                              : ""
                          } ${
                            active
                              ? "bg-[#f8f1ea]"
                              : "hover:bg-[#fcfaf7]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                active
                                  ? "border-[#704329] bg-[#704329] text-white"
                                  : "border-[#cdb9a8] bg-white"
                              }`}
                            >
                              {active && (
                                <Check size={12} />
                              )}
                            </span>

                            <span className="text-sm font-medium text-[#3f2417]">
                              {topping.name}
                            </span>
                          </span>

                          <span className="shrink-0 text-sm font-semibold text-[#704329]">
                            +{formatPrice(topping.price)}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="my-8 h-px bg-[#eadfd5]" />

            {/* =================================================
                NOTE
            ================================================== */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#3f2417]">
                  Ghi chú cho quán
                </h2>

                <span className="text-xs text-[#704329]/45">
                  Không bắt buộc
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white transition focus-within:border-[#704329]/40 focus-within:ring-4 focus-within:ring-[#704329]/5">
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  maxLength={200}
                  rows={3}
                  placeholder="Ví dụ: Ít đá, 50% đường..."
                  className="w-full resize-none bg-transparent px-4 py-3.5 text-sm leading-6 text-[#3f2417] outline-none placeholder:text-[#704329]/35"
                />

                <div className="flex justify-end px-4 pb-3">
                  <span className="text-xs text-[#704329]/40">
                    {note.length}/200
                  </span>
                </div>
              </div>
            </div>

            <div className="my-8 h-px bg-[#eadfd5]" />

            {/* =================================================
                QUANTITY
            ================================================== */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#3f2417]">
                  Số lượng
                </h2>

                <p className="mt-1 text-xs text-[#704329]/50">
                  Chọn số lượng bạn muốn đặt
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={quantity === 1}
                  aria-label="Giảm số lượng"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadfd5] bg-white text-[#704329] transition hover:border-[#704329]/30 hover:bg-[#f8f1ea] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={17} />
                </button>

                <span className="min-w-6 text-center text-base font-semibold">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={quantity >= product.stock - quantityInCart(cartItems, product.id)}
                  aria-label="Tăng số lượng"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#eadfd5] bg-white text-[#704329] transition hover:border-[#704329]/30 hover:bg-[#f8f1ea] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            {/* =================================================
                TOTAL
            ================================================== */}
            <div className="mt-8 border-t border-[#eadfd5] pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#704329]/65">
                  Tổng cộng
                </span>

                <span className="text-2xl font-bold tracking-[-0.03em] text-[#704329]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            {/* =================================================
                ADD TO CART
            ================================================== */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                product.stock <= 0 ||
                product.stock - quantityInCart(cartItems, product.id) <= 0 ||
                isAddingToCart
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3f2417] px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-[#704329] disabled:cursor-not-allowed disabled:opacity-80"
            >
              {showAddedMessage ? (
                <>
                  <Check size={20} />
                  Đã thêm vào giỏ
                </>
              ) : isAddingToCart ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                  Đang thêm...
                </>
              ) : (
                <>
                  <ShoppingCart size={20} />
                  Thêm vào giỏ hàng
                </>
              )}
            </button>

            {stockNotice && (
              <p role="status" className="mt-3 text-center text-xs text-amber-700">
                {stockNotice}
              </p>
            )}

            <p className="mt-3 text-center text-xs text-[#704329]/45">
              Bạn có thể thay đổi lựa chọn trong giỏ hàng.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
