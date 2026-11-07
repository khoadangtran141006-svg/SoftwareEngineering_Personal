"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f3e9de]" />}><ResetPasswordContent /></Suspense>;
}

function ResetPasswordContent() {
  const token = useSearchParams().get("token") ?? "";

  return (
    <main className="min-h-screen bg-[#f3e9de] p-4 sm:p-8">
      <section className="mx-auto mt-8 max-w-xl rounded-[28px] border border-[#eadfd5] bg-white p-7 shadow-[0_20px_60px_rgba(63,36,23,0.08)] sm:mt-16 sm:p-10">
        <h1 className="text-3xl font-semibold text-[#3f2417]">{"\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u"}</h1>
        {token
          ? <ResetPasswordForm token={token} />
          : <p className="mt-4 text-sm text-[#704329]/70">{"Li\u00ean k\u1ebft kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 h\u1ebft h\u1ea1n. "}<Link className="font-semibold underline" href="/forgot-password">{"Y\u00eau c\u1ea7u li\u00ean k\u1ebft m\u1edbi"}</Link>.</p>}
      </section>
    </main>
  );
}
