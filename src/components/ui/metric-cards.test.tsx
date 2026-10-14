import { afterAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Banknote, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils";
import { MetricCard } from "./patterns";

const amounts = [7055000, 8440000, 0, 15495000, -15495000, 1234567890123];

describe("summary card values", () => {
  it.each(amounts)("keeps the complete amount %s without clipping classes", (amount) => {
    for (const card of [
      <MetricCard key="metric" label="ເງິນສົດ" value={formatCurrency(amount)} icon={Banknote} />,
      <StatCard key="stat" label="ຍອດລວມ" value={amount} icon={<Banknote />} />
    ]) {
      const html = renderToStaticMarkup(card);
      expect(html).toContain(formatCurrency(amount));
      expect(html).not.toMatch(/truncate|text-ellipsis|overflow-hidden|whitespace-nowrap/);
      expect(html).toContain("[container-type:inline-size]");
      expect(html).toContain("text-[clamp(1rem,10cqi,1.5rem)]");
      expect(html).toContain("[overflow-wrap:anywhere]");
      expect(html).toContain("tabular-nums");
    }
  });

  it("retains non-currency values, optional hints and icon-free cards", () => {
    expect(renderToStaticMarkup(<StatCard label="ຈໍານວນ" value={12345} currency={false} icon={<ReceiptText />} />))
      .toContain(">12,345</p>");
    const html = renderToStaticMarkup(<MetricCard label="ກະຂາຍ" value="SHIFT-20261014-1234567890" hint="ກະຂາຍປັດຈຸບັນ" />);
    expect(html).toContain("SHIFT-20261014-1234567890");
    expect(html).toContain("ກະຂາຍປັດຈຸບັນ");
  });
});

// Opt-in visual QA using the real components, Tailwind CSS and local Lao fonts.
// Set METRIC_CARDS_QA_DIR to an existing temporary directory; no live data is used.
afterAll(async () => {
  const outputDir = process.env.METRIC_CARDS_QA_DIR;
  if (!outputDir) return;
  const { default: postcss } = await import("postcss");
  const { default: tailwind } = await import("@tailwindcss/postcss");
  const stylesheet = join(process.cwd(), "src/app/globals.css");
  let { css } = await postcss([tailwind()]).process(await readFile(stylesheet, "utf8"), { from: stylesheet });
  for (const font of ["lao", "latin", "latin-ext"]) {
    const filename = `noto-sans-lao-${font}.woff2`;
    const bytes = await readFile(join(process.cwd(), "public/fonts", filename));
    css = css.replaceAll(`/fonts/${filename}`, `data:font/woff2;base64,${bytes.toString("base64")}`);
  }
  const markup = renderToStaticMarkup(
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>ຍອດຂາຍ — ຂໍ້ມູນທົດສອບ</h1>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="ເງິນສົດ" value={formatCurrency(7055000)} icon={Banknote} tone="emerald" />
        <MetricCard label="ເງິນໂອນ" value={formatCurrency(8440000)} icon={CreditCard} tone="sky" />
        <MetricCard label="ອື່ນໆ" value={formatCurrency(0)} icon={Wallet} tone="amber" />
        <MetricCard label="ລວມ 7 ບິນ" value={formatCurrency(15495000)} icon={ReceiptText} tone="indigo" />
      </div>
      <h2 style={{ margin: "24px 0 16px" }}>Dashboard / ຕົວເລກຍາວ</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[7055000, 8440000, 15495000, -15495000, 1234567890123].map((amount) => (
          <StatCard key={amount} label="ຍອດລວມ" value={amount} icon={<Banknote className="h-4 w-4" />} />
        ))}
      </div>
    </main>
  );
  const report = `<script>document.fonts.ready.then(() => {
    const values = [...document.querySelectorAll('p.tabular-nums')];
    const report = { width: innerWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth,
      values: values.map(el => { const style = getComputedStyle(el); const range = document.createRange(); range.selectNodeContents(el);
        return { text: el.textContent, fontSize: style.fontSize, ellipsis: style.textOverflow === 'ellipsis',
          overflow: el.scrollWidth > el.clientWidth, lines: range.getClientRects().length }; }) };
    document.getElementById('layout-report').textContent = JSON.stringify(report);
  });</script>`;
  await writeFile(join(outputDir, "cards.html"), `<!doctype html><html lang="lo"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><body>${markup}<pre id="layout-report" hidden></pre>${report}</body></html>`);
}, 30000);
