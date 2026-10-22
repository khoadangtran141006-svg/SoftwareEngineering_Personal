import Link from "next/link";
import { Coffee } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#3f2417] px-5 py-14 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8a15a] text-[#3f2417]">
                <Coffee size={21} />
              </div>

              <div>
                <div className="text-lg font-bold">BrewLite</div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">
                  More than just coffee
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
              Đặt cà phê nhanh chóng, thanh toán tiện lợi và tận hưởng những
              khoảnh khắc tuyệt vời hơn cùng BrewLite.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Khám phá</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-white/55">
              <Link href="/" className="transition-colors hover:text-white">
                Trang chủ
              </Link>

              <Link
                href="/menu"
                className="transition-colors hover:text-white"
              >
                Menu
              </Link>

              <Link
                href="/about"
                className="transition-colors hover:text-white"
              >
                Về chúng tôi
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Tài khoản</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-white/55">
              <Link
                href="/login"
                className="transition-colors hover:text-white"
              >
                Đăng nhập
              </Link>

              <Link
                href="/register"
                className="transition-colors hover:text-white"
              >
                Đăng ký
              </Link>

              <Link
                href="/orders"
                className="transition-colors hover:text-white"
              >
                Đơn hàng của tôi
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 BrewLite · Dự án học tập, thanh toán chỉ mô phỏng và không trừ tiền thật.</p>

          <p>Crafted with ☕ for better days.</p>
        </div>
      </div>
    </footer>
  );
}