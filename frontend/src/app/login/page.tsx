"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "@/services/auth";
import { EMAIL_PATTERN } from "@/lib/email";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

const PASSWORD_MIN_LENGTH = 8;

export default function LoginPage() {
  return <Suspense fallback={<main className="h-dvh bg-[#f3e9de]" />}><LoginContent /></Suspense>;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const registeredNotice = searchParams.get("registered") === "1"
    ? "Đăng ký thành công. Hãy đăng nhập bằng tài khoản vừa tạo."
    : "";

  function validateEmail(value: string) {
    const message = !value.trim()
      ? "Vui l\u00f2ng \u0111i\u1ec1n th\u00f4ng tin"
      : EMAIL_PATTERN.test(value.trim()) ? "" : "Email kh\u00f4ng h\u1ee3p l\u1ec7";
    setEmailError(message);
    return !message;
  }

  function validatePassword(value: string) {
    const message = !value
      ? "Vui l\u00f2ng \u0111i\u1ec1n th\u00f4ng tin"
      : value.length >= PASSWORD_MIN_LENGTH
        ? ""
        : `M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t ${PASSWORD_MIN_LENGTH} k\u00fd t\u1ef1`;
    setPasswordError(message);
    return !message;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validEmail = validateEmail(email);
    const validPassword = validatePassword(password);
    if (!validEmail || !validPassword) {
      if (!email.trim() || !password) setError("Vui l\u00f2ng \u0111i\u1ec1n email v\u00e0 m\u1eadt kh\u1ea9u.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/menu");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "\u0110\u0103ng nh\u1eadp th\u1ea5t b\u1ea1i");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#f3e9de]">
      <div className="relative mx-auto flex h-full min-h-0 max-w-none overflow-hidden rounded-none bg-[#fcfaf7] shadow-[0_25px_80px_rgba(63,36,23,0.12)]">
        {/* =====================================================
            LEFT BRAND PANEL
        ====================================================== */}
        <section className="relative hidden overflow-hidden bg-[#3f2417] lg:flex lg:w-[48%] lg:flex-col lg:justify-between">
          {/* Decorative circles */}
          <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full border border-white/[0.08]" />

          <div className="absolute -bottom-48 -right-40 h-[520px] w-[520px] rounded-full border border-white/[0.08]" />

          <div className="absolute right-20 top-24 h-32 w-32 rounded-full bg-[#e8a15a]/10 blur-3xl" />

          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#704329]/20 blur-3xl" />

          {/* Brand */}
          <div className="relative z-10 px-10 pt-10 xl:px-14 xl:pt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8a15a] text-[#3f2417] shadow-lg shadow-black/10">
                <LockKeyhole size={20} />
              </div>

              <div>
                <div className="text-lg font-bold tracking-[-0.02em] text-white">
                  BrewLite
                </div>

                <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/40">
                  More than just coffee
                </div>
              </div>
            </Link>
          </div>

          {/* Main message */}
          <div className="relative z-10 px-10 xl:px-14">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e8a15a]">
              Welcome back
            </p>

            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.03] tracking-[-0.06em] text-white xl:text-[64px]">
              Một ly cà phê ngon,
              <br />
              bắt đầu từ một
              <br />
              lựa chọn nhỏ.
            </h1>

            <p className="mt-7 max-w-lg text-sm leading-7 text-white/50">
              Đăng nhập để tiếp tục đặt món, theo dõi đơn hàng
              và tận hưởng trải nghiệm BrewLite một cách thuận
              tiện hơn.
            </p>
          </div>

          {/* Bottom */}
          <div className="relative z-10 flex items-center justify-between px-10 pb-10 text-xs text-white/30 xl:px-14 xl:pb-12">
            <span>© 2026 BrewLite</span>

            <span>Crafted with ☕ for better days.</span>
          </div>
        </section>

        {/* =====================================================
            RIGHT LOGIN AREA
        ====================================================== */}
        <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-4 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[480px] py-3">
            {/* Back */}
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#704329]/55 transition hover:text-[#704329]"
            >
              <ArrowLeft size={16} />
              Về trang chủ
            </Link>

            {/* Login card */}
            <div className="rounded-[28px] border border-[#eadfd5] bg-white p-6 shadow-[0_20px_60px_rgba(63,36,23,0.08)] sm:p-8">
              {/* Heading */}
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3e9de] text-[#704329]">
                  <LockKeyhole size={21} />
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b86f38]">
                  Account
                </p>

                <h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#3f2417] sm:text-[42px]">
                  Đăng nhập
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#704329]/55">
                  Chào mừng bạn trở lại với BrewLite. Đăng nhập
                  để tiếp tục đơn hàng của mình.
                </p>
              </div>

              {/* Form */}
              {registeredNotice && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{registeredNotice}</p>}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-5 space-y-4"
              >
                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[#3f2417]"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setError("");
                      setEmail(event.target.value);
                      validateEmail(event.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? "email-error" : undefined}
                    required
                    className={`h-13 w-full rounded-2xl border ${emailError ? "border-red-500" : "border-[#dfd0c3]"} bg-[#fcfaf7] px-4 text-sm text-[#3f2417] outline-none transition placeholder:text-[#704329]/30 focus:border-[#704329]/50 focus:bg-white focus:ring-4 focus:ring-[#704329]/8`}
                  />
                  {emailError && <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-700">{emailError}</p>}
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-[#3f2417]"
                    >
                      Mật khẩu
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-[#704329]/55 transition hover:text-[#704329]"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword ? "text" : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setError("");
                        setPassword(event.target.value);
                        validatePassword(event.target.value);
                      }}
                      onBlur={() => validatePassword(password)}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? "password-error" : undefined}
                      placeholder="Nhập mật khẩu"
                      required
                      className={`h-13 w-full rounded-2xl border ${passwordError ? "border-red-500" : "border-[#dfd0c3]"} bg-[#fcfaf7] px-4 pr-12 text-sm text-[#3f2417] outline-none transition placeholder:text-[#704329]/30 focus:border-[#704329]/50 focus:bg-white focus:ring-4 focus:ring-[#704329]/8`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      aria-label={
                        showPassword
                          ? "Ẩn mật khẩu"
                          : "Hiện mật khẩu"
                      }
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#704329]/40 transition hover:bg-[#f3e9de] hover:text-[#704329]"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {passwordError && <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-700">{passwordError}</p>}
                </div>

                {/* REMEMBER */}
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#d9c4b2] accent-[#704329]"
                  />

                  <span className="text-sm text-[#704329]/55">
                    Ghi nhớ đăng nhập
                  </span>
                </label>

                {/* SUBMIT */}
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex h-13 w-full items-center justify-center rounded-2xl bg-[#704329] px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(112,67,41,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#5b3522] hover:shadow-[0_14px_30px_rgba(112,67,41,0.22)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Đăng nhập
                </button>
              </form>

              {/* REGISTER */}
              <div className="mt-7 border-t border-[#eadfd5] pt-6 text-center">
                <p className="text-sm text-[#704329]/45">
                  Chưa có tài khoản?
                </p>

                <Link
                  href="/register"
                  className="mt-1.5 inline-flex text-sm font-semibold text-[#704329] transition hover:text-[#b86f38]"
                >
                  Tạo tài khoản mới →
                </Link>
              </div>

              {/* Security */}
              <div className="mt-6 rounded-2xl bg-[#f8f1ea] px-4 py-3.5 text-center">
                <p className="text-[11px] leading-5 text-[#704329]/45">
                  Thông tin tài khoản của bạn được bảo vệ an
                  toàn cùng BrewLite.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
