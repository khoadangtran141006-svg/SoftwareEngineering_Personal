"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Heart,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getProducts } from "@/services/products";
import type { Product as ApiProduct } from "@/types/product";

type Category = "Tất cả" | "Cà phê" | "Trà" | "Trà sữa";

type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  description: string;
  badge?: string;
  image: string;
};

const categories: Category[] = [
  "Tất cả",
  "Cà phê",
  "Trà",
  "Trà sữa",
];

const categoryMap: Record<ApiProduct["category"], Category> = {
  coffee: "Cà phê",
  tea: "Trà",
  "milk-tea": "Trà sữa",
};

const defaultDescriptions: Record<Category, string> = {
  "Tất cả": "Thức uống được pha chế từ những nguyên liệu chọn lọc.",
  "Cà phê": "Đậm đà, thơm béo và cân bằng.",
  Trà: "Thanh mát, thơm nhẹ và sảng khoái.",
  "Trà sữa": "Béo thơm, ngọt dịu và đầy cuốn hút.",
};

function formatPrice(price: number) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function convertProduct(product: ApiProduct): Product {
  const category = categoryMap[product.category];

  return {
    id: product.id,
    name: product.name,
    category,
    price: product.price,
    description: defaultDescriptions[category],
    image: product.imageUrl,
  };
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<Category>("Tất cả");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const data = await getProducts();

        setProducts(data.map(convertProduct));
      } catch {
        setError("Không thể tải menu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return products.filter((product) => {
      const matchCategory =
        activeCategory === "Tất cả" ||
        product.category === activeCategory;

      if (!normalizedSearch) {
        return matchCategory;
      }

      const productName = normalizeText(product.name);
      const description = normalizeText(product.description);
      const category = normalizeText(product.category);

      const matchSearch =
        productName.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        category.includes(normalizedSearch);

      return matchCategory && matchSearch;
    });
  }, [products, activeCategory, search]);

  const suggestions = useMemo(() => {
    if (!search.trim()) {
      return [];
    }

    return filteredProducts.slice(0, 5);
  }, [filteredProducts, search]);

  function resetFilters() {
    setSearch("");
    setActiveCategory("Tất cả");
  }

  return (
    <main className="min-h-screen bg-[#fcfaf7] text-[#3f2417]">
      {/* MENU HERO */}
      <section className="relative overflow-hidden border-b border-[#eadfd5] bg-[#f3e9de]">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#e8a15a]/15 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#704329]/15 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#704329] backdrop-blur">
              <Sparkles size={14} />
              BrewLite Menu
            </div>

            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#3f2417] sm:text-6xl lg:text-7xl">
              Điều gì đó ngon lành
              <span className="block text-[#b86f38]">
                đang chờ bạn.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-[#704329]/75 sm:text-lg">
              Từ những ly cà phê đậm đà đến những món trà mát lành.
              Chọn món yêu thích và để BrewLite chuẩn bị phần còn lại.
            </p>
          </div>
        </div>
      </section>

      {/* STICKY SEARCH */}
      <section className="sticky top-[72px] z-30 border-b border-[#eadfd5] bg-[#fcfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 sm:px-8 lg:px-10">
          <div className="relative max-w-4xl">
            <div className="flex items-center gap-3 rounded-2xl border border-[#704329]/10 bg-white px-4 py-3 shadow-[0_10px_35px_rgba(63,36,23,0.08)]">
              <Search
                size={21}
                className="shrink-0 text-[#704329]/60"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm cà phê, trà, đồ uống..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#3f2417] outline-none placeholder:text-[#704329]/40 sm:text-base"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Xóa tìm kiếm"
                  className="rounded-full p-1.5 text-[#704329]/50 transition hover:bg-[#f3e9de] hover:text-[#704329]"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            {/* SEARCH SUGGESTIONS */}
            {search.trim() && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-[#eadfd5] bg-white shadow-[0_20px_50px_rgba(63,36,23,0.12)]">
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#b86f38]">
                  Gợi ý cho &quot;{search}&quot;
                </div>

                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between gap-4 border-t border-[#f0e7df] px-4 py-3 transition hover:bg-[#f8f1ea]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#3f2417]">
                        {product.name}
                      </p>

                      <p className="mt-0.5 text-xs text-[#704329]/55">
                        {product.category}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-bold text-[#704329]">
                      {formatPrice(product.price)}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {search.trim() && suggestions.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-[#eadfd5] bg-white px-5 py-4 text-sm text-[#704329]/65 shadow-[0_20px_50px_rgba(63,36,23,0.12)]">
                Không tìm thấy sản phẩm phù hợp với &quot;{search}&quot;.
              </div>
            )}

          </div>
        </div>
      </section>

      {/* CATEGORY NAVIGATION */}
      <section className="border-b border-[#eadfd5] bg-[#fcfaf7]">
        <div className="mx-auto max-w-7xl overflow-x-auto px-6 py-4 sm:px-8 lg:px-10">
          <div className="flex min-w-max items-center gap-2">
            {categories.map((category) => {
              const active = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#704329] text-white shadow-md shadow-[#704329]/15"
                      : "border border-[#eadfd5] bg-white text-[#704329]/70 hover:border-[#704329]/20 hover:bg-[#f8f1ea] hover:text-[#704329]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b86f38]">
              Our selection
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#3f2417] sm:text-4xl">
              Menu của BrewLite
            </h2>

            <p className="mt-3 text-sm text-[#704329]/65 sm:text-base">
              {loading
                ? "Đang tải menu..."
                : `${filteredProducts.length} món đang có sẵn cho bạn.`}
            </p>
          </div>

          <div className="hidden rounded-full border border-[#eadfd5] bg-white px-4 py-2 text-sm text-[#704329]/65 sm:block">
            Chọn món → Tùy chỉnh → Thêm vào giỏ
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[350px] items-center justify-center rounded-[28px] border border-[#eadfd5] bg-white">
            <div className="flex flex-col items-center gap-4 text-[#704329]">
              <Loader2
                size={30}
                className="animate-spin"
              />

              <p className="text-sm font-medium">
                Đang tải menu BrewLite...
              </p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-[28px] border border-dashed border-[#d9c4b2] bg-[#f8f1ea] px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#704329] shadow-sm">
              <X size={22} />
            </div>

            <h3 className="mt-5 text-xl font-semibold text-[#3f2417]">
              Không thể tải menu
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#704329]/60">
              {error}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-[#704329] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b3522]"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* PRODUCTS */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group overflow-hidden rounded-[24px] border border-[#eadfd5] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#d9c4b2] hover:shadow-[0_20px_55px_rgba(63,36,23,0.10)]"
              >
                {/* IMAGE */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f1e7dc]">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 90vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />

                  <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#704329] shadow-sm backdrop-blur">
                    {product.category}
                  </div>

                  <div
                    aria-label={`Yêu thích ${product.name}`}
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#704329] shadow-sm backdrop-blur transition group-hover:bg-[#704329] group-hover:text-white"
                  >
                    <Heart size={17} />
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#3f2417]">
                        {product.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#704329]/60">
                        {product.description}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-bold text-[#704329]">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  <div className="my-5 h-px bg-[#eadfd5]" />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#704329]/55">
                      Từ {formatPrice(product.price)}
                    </span>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#704329] text-white transition-all group-hover:bg-[#b86f38] group-hover:shadow-lg">
                      <Plus size={18} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-[#d9c4b2] bg-[#f8f1ea] px-6 py-20 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#704329] shadow-sm">
              <Search size={22} />
            </div>

            <h3 className="mt-5 text-xl font-semibold text-[#3f2417]">
              Không tìm thấy món phù hợp
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#704329]/60">
              Hãy thử một từ khóa khác hoặc chọn một danh mục khác
              để khám phá menu BrewLite.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 rounded-full bg-[#704329] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5b3522]"
            >
              Xem toàn bộ menu
            </button>
          </div>
        )}
      </section>

      {/* BOTTOM CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-16 sm:px-8 lg:px-10 lg:pb-24">
        <div className="relative overflow-hidden rounded-[28px] bg-[#3f2417] px-7 py-12 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#e8a15a]/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#b86f38]/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e8a15a]">
                More than just coffee
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Một ly ngon.
                <span className="block text-[#e8a15a]">
                  Một ngày tốt hơn.
                </span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                Chọn món bạn thích, tùy chỉnh theo cách của bạn và
                để BrewLite chuẩn bị một khoảnh khắc thật dễ chịu.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#e8a15a] px-6 py-3.5 text-sm font-semibold text-[#3f2417] transition hover:bg-[#f0b875]"
            >
              Về trang chủ
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
