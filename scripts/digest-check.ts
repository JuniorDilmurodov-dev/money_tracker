/**
 * Boundary checks for the weekly digest. Run with:
 *   npx tsx scripts/digest-check.ts
 * (tsx is fetched on demand; it is deliberately not a dependency.)
 */
import assert from "node:assert/strict";

import { digestWeekStart, isSunday, today } from "../src/lib/dates";
import {
  buildDigestNotification,
  computeWeeklyDigest,
  formatDigestMoney,
} from "../src/lib/weekly-digest";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

// Tashkent is UTC+5, no DST. 2026-11-15 is a Sunday, 2026-11-09 its Monday.
check("Sunday 23:30 Tashkent is still Sunday → digest for the week ending today", () => {
  const now = new Date("2026-11-15T23:30:00+05:00");
  assert.equal(today(now), "2026-11-15");
  assert.ok(isSunday(today(now)));
  assert.equal(digestWeekStart(today(now)), "2026-11-09");
});

check("Monday 00:30 Tashkent is Monday → not Sunday, forced digest covers the finished week", () => {
  const now = new Date("2026-11-16T00:30:00+05:00"); // = Sunday 19:30 UTC
  assert.equal(now.getUTCDay(), 0, "UTC clock still says Sunday");
  assert.equal(today(now), "2026-11-16");
  assert.ok(!isSunday(today(now)));
  assert.equal(digestWeekStart(today(now)), "2026-11-09");
});

check("Sunday 00:30 Tashkent (still Saturday UTC) is Sunday", () => {
  const now = new Date("2026-11-15T00:30:00+05:00");
  assert.equal(now.getUTCDay(), 6);
  assert.ok(isSunday(today(now)));
  assert.equal(digestWeekStart(today(now)), "2026-11-09");
});

check("the 14:00 UTC cron lands on 19:00 Tashkent, same calendar day", () => {
  assert.equal(today(new Date("2026-11-15T14:00:00Z")), "2026-11-15");
});

check("money formatting", () => {
  assert.equal(formatDigestMoney(850_000, "UZS"), "850 ming so'm");
  assert.equal(formatDigestMoney(1_240_000, "UZS"), "1,2 mln so'm");
  assert.equal(formatDigestMoney(1_000_000, "UZS"), "1 mln so'm");
  assert.equal(formatDigestMoney(999_600, "UZS"), "1 mln so'm");
  assert.equal(formatDigestMoney(40, "USD"), "40 USD");
  assert.equal(formatDigestMoney(12.5, "USD"), "12,5 USD");
});

const row = (amount: number, category: string, currency: "UZS" | "USD" = "UZS") => ({
  amount,
  category,
  currency,
});

check("copy: decreased / increased / flat / empty / multi-currency", () => {
  const w = "2026-11-09";
  const less = buildDigestNotification(
    computeWeeklyDigest(w, [row(1_200_000, "Food")], [row(1_400_000, "Food")]),
  );
  assert.match(less.body, /^1,2 mln so'm — o'tgan haftadan 14% kam 👏 Eng ko'p: Food$/);

  const more = buildDigestNotification(
    computeWeeklyDigest(w, [row(1_200_000, "Food")], [row(1_000_000, "Food")]),
  );
  assert.match(more.body, /o'tgan haftadan 20% ko'p\. Eng ko'p: Food$/);

  const flat = buildDigestNotification(
    computeWeeklyDigest(w, [row(1_000_000, "Food"), row(200_000, "Other")], [row(1_200_000, "Food")]),
  );
  assert.equal(flat.body, "1,2 mln so'm sarfladingiz. Eng ko'p: Food (83%)");

  const empty = buildDigestNotification(computeWeeklyDigest(w, [], [row(5, "Food")]));
  assert.equal(empty.title, "Bu hafta bo'sh qoldi 📝");

  const multi = buildDigestNotification(
    computeWeeklyDigest(w, [row(1_200_000, "Food"), row(40, "Food", "USD")], []),
  );
  assert.equal(multi.body, "1,2 mln so'm + 40 USD — batafsil tahlilni ko'ring");
  assert.equal(multi.url, "/haftalik?w=2026-11-09");
});

check("title rotates by ISO week and stays ≤30; body ≤90 even with a long category", () => {
  const titles = new Set<string>();
  for (let i = 0; i < 4; i += 1) {
    const d = new Date(Date.UTC(2026, 10, 9 + 7 * i)).toISOString().slice(0, 10);
    const n = buildDigestNotification(
      computeWeeklyDigest(d, [row(1_000_000, "x".repeat(120))], [row(2_000_000, "x")]),
    );
    assert.ok([...n.title].length <= 30, n.title);
    assert.ok([...n.body].length <= 90, `${[...n.body].length}: ${n.body}`);
    titles.add(n.title);
  }
  assert.equal(titles.size, 4);
});

check("slices: top 4 + Boshqa, percentages from the currency total", () => {
  const rows = ["A", "B", "C", "D", "E", "F"].map((c, i) => row(600 - i * 100, c));
  const d = computeWeeklyDigest("2026-11-09", rows, []).byCurrency.UZS;
  assert.deepEqual(
    d.slices.map((s) => s.name),
    ["A", "B", "C", "D", "Boshqa"],
  );
  assert.equal(d.slices[4].amount, 300);
  assert.equal(d.topCategory?.name, "A");
});

console.log(`\n${passed} checks passed`);
