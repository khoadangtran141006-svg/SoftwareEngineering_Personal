#!/usr/bin/env node
/**
 * Đo thời gian phản hồi API của BrewLite (yêu cầu phi chức năng: < 500 ms với dữ liệu mẫu).
 * Không cần cài thêm gói; dùng Node.js 22+.
 *
 * Ví dụ:
 *   node scripts/measure-latency.mjs
 *   node scripts/measure-latency.mjs --url http://localhost:3001 --runs 15 --limit 500
 *   node scripts/measure-latency.mjs --email a@b.com --password matkhau123 --markdown
 *
 * Tham số:
 *   --url       địa chỉ API (mặc định http://localhost:3001)
 *   --runs      số lần đo mỗi endpoint, không tính 2 lần khởi động (mặc định 15)
 *   --limit     ngưỡng p95 tính bằng ms (mặc định 500)
 *   --email, --password   đăng nhập một lần để đo thêm các endpoint cần xác thực
 *   --markdown  in thêm bảng Markdown để dán vào docs/testing.md
 *
 * Mã thoát: 0 nếu mọi endpoint có p95 dưới ngưỡng, 1 nếu có endpoint vượt ngưỡng hoặc lỗi.
 */

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, index, all) => {
    if (!token.startsWith('--')) return pairs;
    const next = all[index + 1];
    pairs.push([token.slice(2), next && !next.startsWith('--') ? next : true]);
    return pairs;
  }, []),
);

const baseUrl = String(args.url ?? 'http://localhost:3001').replace(/\/$/, '');
const runs = Math.max(1, Number(args.runs ?? 15));
const limit = Number(args.limit ?? 500);
const WARMUP = 2;

export function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

export function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    min: sorted[0],
    mean: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
}

async function timed(path, init) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, init);
  await response.arrayBuffer();
  return { ms: performance.now() - started, status: response.status };
}

async function measure(label, path, init = {}) {
  const samples = [];
  let failures = 0;
  for (let i = 0; i < WARMUP + runs; i += 1) {
    try {
      const { ms, status } = await timed(path, init);
      if (status >= 400) failures += 1;
      else if (i >= WARMUP) samples.push(ms);
    } catch {
      failures += 1;
    }
  }
  return { label, path, samples, failures };
}

async function main() {
  const targets = [['GET /products', '/products']];

  const list = await fetch(`${baseUrl}/products`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  if (Array.isArray(list) && list.length > 0) targets.push([`GET /products/${list[0].id}`, `/products/${list[0].id}`]);
  targets.push(['GET /promotions/validate', '/promotions/validate?code=BREW10&subtotal=100000']);

  const authTargets = [];
  if (args.email && args.password) {
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: args.email, password: args.password }),
    }).catch(() => null);
    if (login?.ok) {
      const { accessToken } = await login.json();
      const init = { headers: { Authorization: `Bearer ${accessToken}` } };
      authTargets.push(['GET /auth/me', '/auth/me', init], ['GET /orders/me', '/orders/me', init]);
    } else {
      console.error('Không đăng nhập được, bỏ qua các endpoint cần xác thực.');
    }
  }

  const results = [];
  for (const [label, path, init] of [...targets.map((t) => [...t, {}]), ...authTargets]) {
    results.push(await measure(label, path, init));
  }

  const rows = results.map((result) => {
    if (result.samples.length === 0) return { ...result, ok: false };
    const stats = summarize(result.samples);
    return { ...result, ...stats, ok: result.failures === 0 && stats.p95 < limit };
  });

  const fmt = (value) => (Number.isFinite(value) ? value.toFixed(1) : '-');
  console.log(`\nĐo ${runs} lần mỗi endpoint (bỏ ${WARMUP} lần khởi động) tại ${baseUrl}; ngưỡng p95 < ${limit} ms\n`);
  console.log(['Endpoint'.padEnd(28), 'min', 'trung bình', 'p50', 'p95', 'max', 'lỗi', 'kết quả'].join('\t'));
  for (const row of rows) {
    console.log(
      [row.label.padEnd(28), fmt(row.min), fmt(row.mean), fmt(row.p50), fmt(row.p95), fmt(row.max), row.failures, row.ok ? 'ĐẠT' : 'KHÔNG ĐẠT'].join('\t'),
    );
  }

  if (args.markdown) {
    console.log('\n| Endpoint | min (ms) | trung bình (ms) | p50 (ms) | p95 (ms) | max (ms) | Kết quả |\n|---|---|---|---|---|---|---|');
    for (const row of rows) {
      console.log(`| \`${row.label}\` | ${fmt(row.min)} | ${fmt(row.mean)} | ${fmt(row.p50)} | ${fmt(row.p95)} | ${fmt(row.max)} | ${row.ok ? 'Đạt' : 'Không đạt'} |`);
    }
  }

  process.exitCode = rows.every((row) => row.ok) ? 0 : 1;
}

const isMain = import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('measure-latency.mjs');
if (isMain) {
  main().catch((error) => {
    console.error('Không thể đo:', error.message);
    process.exitCode = 1;
  });
}
