"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, ReceiptText, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMe, getCurrentUser, getToken, signOut, type AuthUser } from "@/services/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/profile");
      return;
    }
    // Lấy dữ liệu mới nhất (điểm thưởng) từ backend.
    fetchMe().then((me) => {
      setUser(me ?? getCurrentUser());
      setLoading(false);
    });
  }, [router]);

  function handleSignOut() {
    signOut();
    router.replace("/");
  }

  if (loading) {
    return <main className="flex min-h-[60vh] items-center justify-center text-[#704329]">Loading account...</main>;
  }

  return (
    <main className="min-h-[70vh] bg-[#fcfaf7] px-5 py-12 text-[#3f2417] sm:px-8 sm:py-16">
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b86f38]">BREWLITE</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{"Thông tin cá nhân"}</h1>
        <p className="mt-3 text-sm text-[#704329]/65">{"Quản lý tài khoản và theo dõi đơn hàng của bạn."}</p>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[#eadfd5] bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-[#eadfd5] bg-[#f8f1ea] p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#704329] text-white"><UserRound size={25} /></div>
            <div>
              <h2 className="text-lg font-semibold">{"Tài khoản"}</h2>
              <p className="mt-1 text-sm text-[#704329]/65">{user?.name ?? "BrewLite customer"}</p>
              <p className="text-sm text-[#704329]/65">{user?.email ?? ""}</p>
              {user?.role === "STAFF" && (
                <Link href="/staff" className="mt-3 inline-flex rounded-full border border-[#704329] px-3 py-1 text-xs font-semibold text-[#704329] transition hover:bg-[#f8f1ea]">
                  Mở quầy pha chế
                </Link>
              )}
              {typeof user?.loyaltyPoints === "number" && (
                <p className="mt-2 inline-flex rounded-full bg-[#704329] px-3 py-1 text-xs font-semibold text-white">
                  {`${user.loyaltyPoints} điểm thưởng`}
                </p>
              )}
            </div>
          </div>

          <nav aria-label="Account navigation" className="divide-y divide-[#eadfd5]">
            <Link href="/orders" className="flex items-center justify-between p-6 transition hover:bg-[#fcfaf7] sm:px-8">
              <span className="flex items-center gap-3 text-sm font-medium"><ReceiptText size={18} className="text-[#b86f38]" />{"Lịch sử đơn hàng"}</span>
              <ArrowRight size={17} className="text-[#704329]/50" />
            </Link>
            <button type="button" onClick={handleSignOut} className="flex w-full items-center justify-between p-6 text-left transition hover:bg-[#fcfaf7] sm:px-8">
              <span className="flex items-center gap-3 text-sm font-medium text-red-700"><LogOut size={18} />{"Đăng xuất"}</span>
              <ArrowRight size={17} className="text-[#704329]/50" />
            </button>
          </nav>
        </div>
      </section>
    </main>
  );
}
