"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useOrdersStore } from "@/stores/orders-store";
import { getToken } from "@/services/auth";

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

type PaymentMethod = "qr" | "wallet" | "card";

const WALLET_PROVIDERS = ["MoMo", "ZaloPay", "ShopeePay"] as const;
type WalletProvider = (typeof WALLET_PROVIDERS)[number];
const VN_MOBILE_REGEX = /^0(3|5|7|8|9)\d{8}$/;

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function maskPhone(phone: string) {
  return phone.length >= 10 ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : phone;
}

const METHOD_LABEL = {
  qr: "QR Code",
  wallet: "Ví điện tử",
  card: "Thẻ ngân hàng",
} as const satisfies Record<PaymentMethod, string>;

export default function PaymentPage() {
  const router = useRouter();

  const clearCart = useCartStore((state) => state.clearCart);

  const addOrder = useOrdersStore((state) => state.addOrder);

  const cartItems = useCartStore((state) => state.items);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("qr");

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [walletAccount, setWalletAccount] =
    useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardError, setCardError] = useState("");
  const [walletProvider, setWalletProvider] = useState<WalletProvider>("MoMo");
  const [walletError, setWalletError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [pendingOrder, setPendingOrder] = useState<{ id: number; orderCode: string; total: number } | null>(null);

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
  const discount = promoApplied?.discount ?? 0;
  const total = subtotal + serviceFee - discount;

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code || promoChecking) return;
    setPromoChecking(true);
    setPromoMessage("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const response = await fetch(`${apiUrl}/promotions/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`);
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Mã khuyến mãi không hợp lệ");
      setPromoApplied({ code: result.code, discount: result.discount });
      setPromoMessage(`Đã áp dụng mã ${result.code}`);
    } catch (cause) {
      setPromoApplied(null);
      setPromoMessage(cause instanceof Error ? cause.message : "Không thể kiểm tra mã khuyến mãi");
    } finally {
      setPromoChecking(false);
    }
  }

  function removePromo() {
    setPromoApplied(null);
    setPromoInput("");
    setPromoMessage("");
  }

  // Tạo đơn PENDING rồi gọi mock payment gateway qua API backend.
  async function handlePayment() {
    if (cartItems.length === 0 || isProcessing) return;
    if (!getToken()) {
      router.push("/login?next=/payment");
      return;
    }

    if (paymentMethod === "card") {
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 16 || digits.length > 19) {
        setCardError("Số thẻ phải gồm 16–19 chữ số.");
        return;
      }
      setCardError("");
    }

    if (paymentMethod === "wallet") {
      if (!VN_MOBILE_REGEX.test(walletAccount.trim())) {
        setWalletError("Số điện thoại ví không hợp lệ (10 số, bắt đầu 03, 05, 07, 08 hoặc 09).");
        return;
      }
      setWalletError("");
      // Giống Shopee/TikTok Shop: xác nhận giao dịch trên ví bằng mã OTP trước khi trừ tiền.
      setOtp("");
      setOtpError("");
      setOtpOpen(true);
      return;
    }

    await submitPayment();
  }

  async function confirmWalletOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Mã OTP gồm 6 chữ số.");
      return;
    }
    setOtpOpen(false);
    await submitPayment(otp);
  }

  async function submitPayment(otpValue?: string) {
    const token = getToken();
    if (!token) {
      router.push("/login?next=/payment");
      return;
    }
    const cardDigits = cardNumber.replace(/\D/g, "");
    setPaymentError("");
    setIsProcessing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      let order = pendingOrder;
      if (!order) {
        const orderResponse = await fetch(`${apiUrl}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: cartItems.map((item) => ({ productId: item.id, size: item.size, quantity: item.quantity, toppings: item.toppings })), promotionCode: promoApplied?.code }),
        });
        const result = await orderResponse.json();
        if (!orderResponse.ok) throw new Error(result.message ?? "Không thể tạo đơn hàng");
        order = result;
        setPendingOrder(order);
      }
      if (!order) throw new Error("Không thể tạo đơn hàng");
      const paymentResponse = await fetch(`${apiUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          orderId: order.id,
          method: METHOD_LABEL[paymentMethod],
          ...(paymentMethod === "card"
            ? { cardNumber: cardDigits }
            : paymentMethod === "wallet"
              ? { walletProvider, walletPhone: walletAccount.trim(), otp: otpValue }
              : { token: "approved" }),
        }),
      });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(payment.message ?? "Thanh toán thất bại");
      if (payment.status !== "SUCCEEDED") throw new Error("Giao dịch bị từ chối. Hãy thử lại.");
      addOrder({ id: order.orderCode, createdAt: new Date().toISOString(), status: "PAID", paymentMethod: METHOD_LABEL[paymentMethod], items: cartItems.map((item) => ({ id: item.id, name: item.name, image: item.image, category: item.category, size: item.size, toppings: [...item.toppings], note: item.note, unitPrice: item.unitPrice, quantity: item.quantity })), totalQuantity, total: order.total });
      clearCart();
      setPendingOrder(null);
      router.push(`/order-success?payment=${paymentMethod}&order=${order.orderCode}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Không thể hoàn tất thanh toán";
      if (message.includes("không ở trạng thái chờ thanh toán")) {
        // Đơn đã bị hủy (quá hạn hoặc đã hủy ở nơi khác): bỏ đơn cũ để lần sau tạo đơn mới.
        setPendingOrder(null);
        setPaymentError("Đơn hàng đã bị hủy do quá thời gian chờ thanh toán. Hãy bấm thanh toán lại để tạo đơn mới.");
      } else {
        setPaymentError(message);
      }
    } finally {
      setIsProcessing(false);
    }
  }

  /*
   * EMPTY CART
   */
  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
        {/* =====================================================
            PAGE HEADER
        ====================================================== */}
        <section className="border-b border-[#eadfd5] bg-[#f3e9de]">
          <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b86f38]">
                Checkout
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[#3f2417] sm:text-5xl lg:text-6xl">
                Thanh toán
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#704329]/65 sm:text-base">
                Hoàn tất đơn hàng của bạn một cách nhanh
                chóng và thuận tiện.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-dashed border-[#d9c4b2] bg-[#f8f1ea] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#704329] shadow-sm">
              <ShoppingBag size={26} />
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[#3f2417]">
              Chưa có sản phẩm để thanh toán
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#704329]/60">
              Hãy thêm ít nhất một món vào giỏ hàng
              trước khi tiến hành thanh toán.
            </p>

            <Link
              href="/menu"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#704329] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5b3522] hover:shadow-lg hover:shadow-[#704329]/15 active:scale-[0.98]"
            >
              Khám phá menu
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
      {/* =======================================================
          PAGE HEADER
      ======================================================== */}
      <section className="border-b border-[#eadfd5] bg-[#f3e9de]">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b86f38]">
              Checkout
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[#3f2417] sm:text-5xl lg:text-6xl">
              Thanh toán đơn hàng
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#704329]/65 sm:text-base">
              Kiểm tra lại món uống và chọn phương thức
              thanh toán phù hợp với bạn.
            </p>
          </div>
        </div>
      </section>

      {/* =======================================================
          CHECKOUT CONTENT
      ======================================================== */}
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_390px] lg:gap-10">
          {/* ===================================================
              LEFT — ORDER
          ==================================================== */}
          <div>
            {/* BACK TO CART */}
            <Link
              href="/cart"
              className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#704329]/65 transition hover:text-[#704329]"
            >
              <ArrowLeft size={17} />
              Quay lại giỏ hàng
            </Link>

            {/* ORDER HEADER */}
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b86f38]">
                  Your order
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#3f2417]">
                  Đơn hàng của bạn
                </h2>
              </div>

              <span className="rounded-full border border-[#eadfd5] bg-white px-3.5 py-2 text-xs font-medium text-[#704329]/60">
                {totalQuantity} món
              </span>
            </div>

            {/* ORDER ITEMS */}
            <div className="space-y-4">
              {cartItems.map((item) => (
                <article
                  key={item.cartKey}
                  className="overflow-hidden rounded-[24px] border border-[#eadfd5] bg-white shadow-[0_10px_35px_rgba(63,36,23,0.05)]"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex gap-4 sm:gap-5">
                      {/* IMAGE */}
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f1e7dc] sm:h-28 sm:w-28">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 96px, 112px"
                          className="object-cover"
                        />
                      </div>

                      {/* INFO */}
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

                          <span className="shrink-0 rounded-full bg-[#f3e9de] px-3 py-1.5 text-xs font-semibold text-[#704329]">
                            × {item.quantity}
                          </span>
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

                        {/* PRICE */}
                        <div className="mt-4 flex items-end justify-between gap-4">
                          <span className="text-xs text-[#704329]/45">
                            {formatPrice(item.unitPrice)} ×{" "}
                            {item.quantity}
                          </span>

                          <span className="text-lg font-bold tracking-[-0.03em] text-[#704329]">
                            {formatPrice(
                              item.unitPrice *
                                item.quantity,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* ORDER NOTICE */}
            <div className="mt-6 flex gap-3 rounded-2xl border border-[#eadfd5] bg-[#f8f1ea] px-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#704329]">
                <ShoppingBag size={17} />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#3f2417]">
                  Kiểm tra đơn hàng
                </p>

                <p className="mt-1 text-xs leading-5 text-[#704329]/55">
                  Bạn có thể quay lại giỏ hàng để thay đổi
                  số lượng hoặc tùy chỉnh món trước khi
                  thanh toán.
                </p>
              </div>
            </div>
          </div>

          {/* ===================================================
              RIGHT — PAYMENT
          ==================================================== */}
          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[28px] border border-[#eadfd5] bg-white shadow-[0_15px_45px_rgba(63,36,23,0.08)]">
              {/* PAYMENT HEADER */}
              <div className="bg-[#3f2417] px-6 py-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e8a15a]">
                      Payment
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Thanh toán
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <CreditCard size={19} />
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* =================================================
                    PAYMENT METHODS
                ================================================== */}
                <div>
                  <p className="text-sm font-semibold text-[#3f2417]">
                    Phương thức thanh toán
                  </p>

                  <div className="mt-4 space-y-3">
                    {/* QR CODE */}
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentMethod("qr")
                      }
                      aria-pressed={paymentMethod === "qr"}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        paymentMethod === "qr"
                          ? "border-[#704329] bg-[#f8f1ea] shadow-sm"
                          : "border-[#eadfd5] bg-white hover:border-[#d9c4b2] hover:bg-[#fcfaf7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            paymentMethod === "qr"
                              ? "bg-[#704329] text-white"
                              : "bg-[#f3e9de] text-[#704329]"
                          }`}
                        >
                          <QrCode size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#3f2417]">
                              QR Code
                            </p>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                paymentMethod === "qr"
                                  ? "border-[#704329] bg-[#704329] text-white"
                                  : "border-[#d9c4b2] bg-white"
                              }`}
                            >
                              {paymentMethod === "qr" && (
                                <Check size={12} />
                              )}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[#704329]/50">
                            Quét mã để thanh toán nhanh chóng
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* E-WALLET */}
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentMethod("wallet")
                      }
                      aria-pressed={
                        paymentMethod === "wallet"
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        paymentMethod === "wallet"
                          ? "border-[#704329] bg-[#f8f1ea] shadow-sm"
                          : "border-[#eadfd5] bg-white hover:border-[#d9c4b2] hover:bg-[#fcfaf7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            paymentMethod === "wallet"
                              ? "bg-[#704329] text-white"
                              : "bg-[#f3e9de] text-[#704329]"
                          }`}
                        >
                          <WalletCards size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#3f2417]">
                              Ví điện tử
                            </p>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                paymentMethod === "wallet"
                                  ? "border-[#704329] bg-[#704329] text-white"
                                  : "border-[#d9c4b2] bg-white"
                              }`}
                            >
                              {paymentMethod ===
                                "wallet" && (
                                <Check size={12} />
                              )}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[#704329]/50">
                            Thanh toán qua ví điện tử
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* BANK CARD */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      aria-pressed={paymentMethod === "card"}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        paymentMethod === "card"
                          ? "border-[#704329] bg-[#f8f1ea] shadow-sm"
                          : "border-[#eadfd5] bg-white hover:border-[#d9c4b2] hover:bg-[#fcfaf7]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            paymentMethod === "card"
                              ? "bg-[#704329] text-white"
                              : "bg-[#f3e9de] text-[#704329]"
                          }`}
                        >
                          <CreditCard size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#3f2417]">
                              Thẻ ngân hàng
                            </p>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                paymentMethod === "card"
                                  ? "border-[#704329] bg-[#704329] text-white"
                                  : "border-[#d9c4b2] bg-white"
                              }`}
                            >
                              {paymentMethod === "card" && <Check size={12} />}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[#704329]/50">
                            Thanh toán bằng thẻ ATM/Visa/Mastercard
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* =================================================
                    PAYMENT DETAIL
                ================================================== */}
                <div className="mt-5">
                  {paymentMethod === "qr" ? (
                    <div className="rounded-2xl border border-[#eadfd5] bg-[#fcfaf7] p-5">
                      <div className="flex flex-col items-center text-center">
                        {/* QR MOCK */}
                        <div className="flex h-44 w-44 items-center justify-center rounded-2xl border border-[#eadfd5] bg-white p-4 shadow-sm">
                          <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1 opacity-90">
                            {Array.from(
                              { length: 49 },
                              (_, index) => {
                                const shouldFill =
                                  (index * 17 +
                                    index * index) %
                                    7 <
                                  3;

                                return (
                                  <span
                                    key={index}
                                    className={
                                      shouldFill
                                        ? "rounded-[1px] bg-[#3f2417]"
                                        : "rounded-[1px] bg-transparent"
                                    }
                                  />
                                );
                              },
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#704329]">
                          <Smartphone size={14} />
                          Quét mã để thanh toán
                        </div>

                        <p className="mt-2 max-w-xs text-xs leading-5 text-[#704329]/50">
                          Mở ứng dụng ngân hàng hoặc ví điện
                          tử và quét mã QR để tiếp tục.
                        </p>
                      </div>
                    </div>
                  ) : paymentMethod === "card" ? (
                    <div className="rounded-2xl border border-[#eadfd5] bg-[#fcfaf7] p-5">
                      <label
                        htmlFor="card-number"
                        className="block text-sm font-semibold text-[#3f2417]"
                      >
                        Số thẻ
                      </label>

                      <div className="relative mt-3">
                        <CreditCard
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#704329]/35"
                        />

                        <input
                          id="card-number"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          pattern="[0-9]*"
                          maxLength={19}
                          value={cardNumber}
                          aria-invalid={Boolean(cardError)}
                          onChange={(event) => {
                            // Chỉ giữ chữ số và KHÔNG tự chèn dấu cách vào ô nhập,
                            // để con trỏ không bị nhảy và người dùng nhập đúng số họ muốn.
                            setCardNumber(event.target.value.replace(/\D/g, "").slice(0, 19));
                            setCardError("");
                          }}
                          onBlur={() => {
                            const digits = cardNumber.replace(/\D/g, "");
                            if (digits.length > 0 && (digits.length < 16 || digits.length > 19)) {
                              setCardError("Số thẻ phải gồm 16–19 chữ số.");
                            }
                          }}
                          placeholder="Nhập 16–19 chữ số, không cần dấu cách"
                          className="h-12 w-full rounded-2xl border border-[#dfd0c3] bg-white pl-11 pr-4 text-sm text-[#3f2417] outline-none transition placeholder:text-[#704329]/30 focus:border-[#704329]/50 focus:ring-4 focus:ring-[#704329]/8"
                        />
                      </div>

                      {cardNumber && (
                        <p aria-live="polite" className="mt-3 font-mono text-sm tracking-widest text-[#704329]">
                          {formatCardNumber(cardNumber)}
                        </p>
                      )}

                      {cardError ? (
                        <p role="alert" className="mt-2 text-xs text-red-700">{cardError}</p>
                      ) : (
                        <p className="mt-2 text-xs text-[#704329]/50">
                          {`Đã nhập ${cardNumber.replace(/\D/g, "").length}/19 chữ số (cần 16–19 chữ số).`}
                        </p>
                      )}

                      <p className="mt-3 text-xs leading-5 text-[#704329]/45">
                        Giao diện mô phỏng, không lưu thông tin thẻ. Dùng số
                        4000000000000002 để thử trường hợp thanh toán bị từ
                        chối.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#eadfd5] bg-[#fcfaf7] p-5">
                      <p className="text-sm font-semibold text-[#3f2417]">Chọn ví điện tử</p>

                      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ví điện tử">
                        {WALLET_PROVIDERS.map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            role="radio"
                            aria-checked={walletProvider === provider}
                            onClick={() => setWalletProvider(provider)}
                            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                              walletProvider === provider
                                ? "border-[#704329] bg-[#704329] text-white"
                                : "border-[#eadfd5] bg-white text-[#704329] hover:border-[#d9c4b2]"
                            }`}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>

                      <label
                        htmlFor="wallet-account"
                        className="mt-5 block text-sm font-semibold text-[#3f2417]"
                      >
                        {`Số điện thoại đăng ký ví ${walletProvider}`}
                      </label>

                      <div className="relative mt-3">
                        <Smartphone
                          size={17}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#704329]/35"
                        />

                        <input
                          id="wallet-account"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          value={walletAccount}
                          aria-invalid={Boolean(walletError)}
                          onChange={(event) => {
                            setWalletAccount(event.target.value.replace(/\D/g, "").slice(0, 10));
                            setWalletError("");
                          }}
                          placeholder="0912345678"
                          className="h-12 w-full rounded-2xl border border-[#dfd0c3] bg-white pl-11 pr-4 text-sm text-[#3f2417] outline-none transition placeholder:text-[#704329]/30 focus:border-[#704329]/50 focus:ring-4 focus:ring-[#704329]/8"
                        />
                      </div>

                      {walletError && <p role="alert" className="mt-2 text-xs text-red-700">{walletError}</p>}

                      <p className="mt-3 text-xs leading-5 text-[#704329]/45">
                        {`Sau khi bấm thanh toán, bạn sẽ xác nhận giao dịch trên ví ${walletProvider} bằng mã OTP. Đây là giao diện mô phỏng, không trừ tiền thật.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* =================================================
                    PROMO CODE
                ================================================== */}
                <div className="mt-5">
                  <label htmlFor="promo-code" className="block text-sm font-semibold text-[#3f2417]">
                    Mã khuyến mãi
                  </label>
                  <div className="mt-3 flex gap-2">
                    <input
                      id="promo-code"
                      type="text"
                      value={promoInput}
                      onChange={(event) => setPromoInput(event.target.value)}
                      disabled={Boolean(promoApplied) || Boolean(pendingOrder)}
                      placeholder="Nhập mã (ví dụ BREW10)"
                      className="h-12 min-w-0 flex-1 rounded-2xl border border-[#dfd0c3] bg-white px-4 text-sm uppercase text-[#3f2417] outline-none transition placeholder:normal-case placeholder:text-[#704329]/30 focus:border-[#704329]/50 focus:ring-4 focus:ring-[#704329]/8 disabled:bg-[#f8f1ea]"
                    />
                    {promoApplied ? (
                      <button
                        type="button"
                        onClick={removePromo}
                        disabled={Boolean(pendingOrder)}
                        className="h-12 rounded-2xl border border-[#dfd0c3] px-4 text-sm font-semibold text-[#704329] transition hover:bg-[#f8f1ea] disabled:opacity-60"
                      >
                        Bỏ mã
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={promoChecking || !promoInput.trim()}
                        className="h-12 rounded-2xl bg-[#704329] px-4 text-sm font-semibold text-white transition hover:bg-[#5b3522] disabled:opacity-60"
                      >
                        {promoChecking ? "Đang kiểm tra..." : "Áp dụng"}
                      </button>
                    )}
                  </div>
                  {promoMessage && (
                    <p role="status" className={`mt-2 text-xs ${promoApplied ? "text-green-700" : "text-red-700"}`}>
                      {promoMessage}
                    </p>
                  )}
                </div>

                {/* =================================================
                    ORDER SUMMARY
                ================================================== */}
                <div className="my-6 h-px bg-[#eadfd5]" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#704329]/60">
                      Tạm tính
                    </span>

                    <span className="font-medium text-[#3f2417]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#704329]/60">
                      Phí dịch vụ
                    </span>

                    <span className="font-medium text-[#3f2417]">
                      {serviceFee === 0
                        ? "Miễn phí"
                        : formatPrice(serviceFee)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-[#704329]/60">{`Giảm giá (${promoApplied?.code})`}</span>
                      <span className="font-medium text-green-700">{`-${formatPrice(discount)}`}</span>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-4 pt-1">
                    <span className="text-sm font-semibold text-[#3f2417]">
                      Tổng cộng
                    </span>

                    <span className="text-2xl font-bold tracking-[-0.03em] text-[#704329]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* =================================================
                    PAYMENT BUTTON
                ================================================== */}
                {paymentError && <p role="alert" className="mt-4 text-sm text-red-700">{paymentError}</p>}
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#704329] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(112,67,41,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#5b3522] hover:shadow-[0_14px_30px_rgba(112,67,41,0.22)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isProcessing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Đang xử lý thanh toán...
                    </>
                  ) : (
                    <>
                      Thanh toán {formatPrice(total)}

                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                {otpOpen && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" role="presentation">
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="otp-title"
                      className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
                    >
                      <h2 id="otp-title" className="text-lg font-semibold text-[#3f2417]">
                        {`Xác nhận thanh toán qua ${walletProvider}`}
                      </h2>
                      <p className="mt-2 text-sm text-[#704329]/70">
                        {`Thanh toán ${formatPrice(total)} từ ví gắn với số ${maskPhone(walletAccount.trim())}.`}
                      </p>

                      <label htmlFor="wallet-otp" className="mt-5 block text-sm font-semibold text-[#3f2417]">
                        Mã OTP (6 chữ số)
                      </label>
                      <input
                        id="wallet-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        autoFocus
                        value={otp}
                        onChange={(event) => {
                          setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                          setOtpError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void confirmWalletOtp();
                        }}
                        placeholder="______"
                        className="mt-2 h-12 w-full rounded-2xl border border-[#dfd0c3] bg-white px-4 text-center text-lg tracking-[0.5em] text-[#3f2417] outline-none focus:border-[#704329]/50 focus:ring-4 focus:ring-[#704329]/8"
                      />
                      {otpError && <p role="alert" className="mt-2 text-xs text-red-700">{otpError}</p>}
                      <p className="mt-3 text-xs leading-5 text-[#704329]/45">
                        Demo: nhập 123456 để thanh toán thành công; nhập mã khác để thử trường hợp bị từ chối.
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setOtpOpen(false)}
                          className="h-12 rounded-2xl border border-[#dfd0c3] text-sm font-semibold text-[#704329] transition hover:bg-[#f8f1ea]"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => void confirmWalletOtp()}
                          className="h-12 rounded-2xl bg-[#704329] text-sm font-semibold text-white transition hover:bg-[#5b3522]"
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY */}
                <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#704329]/45">
                  <ShieldCheck size={14} />

                  <span>
                    Thanh toán an toàn và được bảo mật
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-[#704329]/35">
                  <LockKeyhole size={12} />

                  <span>
                    Thông tin thanh toán được bảo vệ
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
