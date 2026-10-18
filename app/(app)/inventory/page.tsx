import Link from "next/link";
import { db } from "../../lib/db";
import { products, categories } from "../../lib/schema";
import { eq, and, like, sql } from "drizzle-orm";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; q?: string; cat?: string; page?: string }>;
}) {
  const { store, q, cat, page } = await searchParams;
  const storeId = store ? Number(store) : 1;
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = 20;

  // Fetch categories for filter dropdown
  const allCategories = await db.select().from(categories);

  // Build where conditions
  const conditions = [eq(products.storeId, storeId)];
  if (q) {
    conditions.push(like(products.name, `%${q}%`));
  }
  if (cat) {
    conditions.push(eq(products.categoryId, Number(cat)));
  }

  // Count total for pagination
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(products)
    .where(and(...conditions));
  const totalCount = Number(total);
  const totalPages = Math.ceil(totalCount / perPage);

  // Fetch products with category join + pagination
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      unit: products.unit,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      quantity: products.quantity,
      lowStockThreshold: products.lowStockThreshold,
      expiryDate: products.expiryDate,
      categoryName: categories.name,
      categoryIcon: categories.icon,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .limit(perPage)
    .offset((currentPage - 1) * perPage);

  const now = new Date();

  function qtyColor(qty: number, threshold: number) {
    if (qty === 0) return "text-danger";
    if (qty <= threshold) return "text-warm-amber";
    return "text-success";
  }

  function expiryWarning(expiryDate: string | null) {
    if (!expiryDate) return null;
    const diff = Math.ceil(
      (new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff <= 0) return { label: "Expired", className: "text-danger font-bold" };
    if (diff <= 7) return { label: `${diff}d left`, className: "text-danger font-semibold" };
    return { label: `${diff}d left`, className: "text-earth-brown" };
  }

  function margin(cost: string, sell: string) {
    const c = parseFloat(cost);
    const s = parseFloat(sell);
    if (c === 0) return 0;
    return ((s - c) / c) * 100;
  }

  return (
    <div className="min-h-screen bg-light-gray px-4 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-earth-brown sm:text-3xl">
            Inventory
          </h1>
          <p className="text-sm text-earth-brown/60">
            {productRows.length} product{productRows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/inventory/add?store=${storeId}`}
          className="hidden rounded-xl bg-beelee-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 sm:inline-flex"
        >
          + Add Product
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <form
        method="GET"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="store" value={storeId} />
        <input
          type="text"
          name="q"
          placeholder="Search products..."
          defaultValue={q ?? ""}
          className="flex-1 rounded-xl border border-earth-brown/20 bg-white px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
        />
        <select
          name="cat"
          defaultValue={cat ?? ""}
          className="rounded-xl border border-earth-brown/20 bg-white px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
        >
          <option value="">All Categories</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-honey-gold px-5 py-2.5 text-sm font-semibold text-earth-brown transition hover:opacity-90"
        >
          Filter
        </button>
      </form>

      {/* Empty state */}
      {productRows.length === 0 && (
        <div className="rounded-2xl bg-white p-12 text-center">
          <p className="text-lg text-earth-brown/50">No products found.</p>
          <Link
            href={`/inventory/add?store=${storeId}`}
            className="mt-4 inline-block rounded-xl bg-beelee-teal px-6 py-2.5 text-sm font-semibold text-white"
          >
            Add your first product
          </Link>
        </div>
      )}

      {/* Mobile card layout */}
      {productRows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:hidden">
          {productRows.map((p) => {
            const exp = expiryWarning(p.expiryDate);
            const m = margin(p.costPrice, p.sellingPrice);
            return (
              <Link
                key={p.id}
                href={`/inventory/${p.id}?store=${storeId}`}
                className="block rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">{p.categoryIcon ?? "📦"}</span>
                  <span className="font-bold text-earth-brown">{p.name}</span>
                </div>
                <div className="mb-2 flex items-center gap-3 text-xs text-earth-brown/60">
                  {p.sku && <span>SKU: {p.sku}</span>}
                  {p.barcode && <span>BC: {p.barcode}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-bold ${qtyColor(p.quantity, p.lowStockThreshold)}`}>
                    {p.quantity} <span className="text-xs font-normal">{p.unit}</span>
                  </span>
                  <div className="text-right text-xs">
                    <div>
                      Cost: <span className="font-semibold">&#8369;{parseFloat(p.costPrice).toFixed(2)}</span>
                    </div>
                    <div>
                      Sell: <span className="font-semibold">&#8369;{parseFloat(p.sellingPrice).toFixed(2)}</span>
                    </div>
                    <div className="text-beelee-teal font-semibold">
                      {m.toFixed(1)}% margin
                    </div>
                  </div>
                </div>
                {exp && (
                  <div className={`mt-2 text-xs ${exp.className}`}>
                    Expires: {p.expiryDate} ({exp.label})
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Desktop table layout */}
      {productRows.length > 0 && (
        <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-earth-brown/10 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Sell</th>
                <th className="px-4 py-3">Margin</th>
                <th className="px-4 py-3">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-brown/5">
              {productRows.map((p) => {
                const exp = expiryWarning(p.expiryDate);
                const m = margin(p.costPrice, p.sellingPrice);
                return (
                  <tr key={p.id} className="transition hover:bg-soft-teal/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/${p.id}?store=${storeId}`}
                        className="flex items-center gap-2 font-bold text-earth-brown hover:text-beelee-teal"
                      >
                        <span className="text-lg">{p.categoryIcon ?? "📦"}</span>
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-earth-brown/60">
                      <div>{p.sku ?? "-"}</div>
                      <div className="text-xs">{p.barcode ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${qtyColor(p.quantity, p.lowStockThreshold)}`}>
                        {p.quantity}
                      </span>
                      <span className="ml-1 text-xs text-earth-brown/50">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-earth-brown">
                      &#8369;{parseFloat(p.costPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-earth-brown">
                      &#8369;{parseFloat(p.sellingPrice).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-beelee-teal">
                      {m.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      {exp ? (
                        <span className={exp.className}>
                          {p.expiryDate} ({exp.label})
                        </span>
                      ) : (
                        <span className="text-earth-brown/40">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-earth-brown/60">
            Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalCount)} of {totalCount} products
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/inventory?store=${storeId}${q ? `&q=${q}` : ""}${cat ? `&cat=${cat}` : ""}&page=${currentPage - 1}`}
                className="rounded-lg bg-light-gray px-4 py-2 text-sm font-semibold text-earth-brown hover:bg-soft-teal transition"
              >
                ← Prev
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/inventory?store=${storeId}${q ? `&q=${q}` : ""}${cat ? `&cat=${cat}` : ""}&page=${p}`}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  p === currentPage
                    ? "bg-beelee-teal text-white"
                    : "bg-light-gray text-earth-brown hover:bg-soft-teal"
                }`}
              >
                {p}
              </Link>
            ))}
            {currentPage < totalPages && (
              <Link
                href={`/inventory?store=${storeId}${q ? `&q=${q}` : ""}${cat ? `&cat=${cat}` : ""}&page=${currentPage + 1}`}
                className="rounded-lg bg-light-gray px-4 py-2 text-sm font-semibold text-earth-brown hover:bg-soft-teal transition"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile */}
      <Link
        href={`/inventory/add?store=${storeId}`}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-beelee-teal text-2xl font-bold text-white shadow-lg transition hover:opacity-90 sm:hidden"
        aria-label="Add product"
      >
        +
      </Link>
    </div>
  );
}
