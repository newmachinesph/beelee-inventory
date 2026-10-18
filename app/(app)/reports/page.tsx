import { db } from "../../lib/db";
import { products, categories, stockMovements, stores } from "../../lib/schema";
import { eq, and, desc, sql, gte, lte, count } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
};

const phpFormat = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const storeId = Number(params.store) || 1;

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    storeData,
    stockValueByCategory,
    bestSellers,
    allProducts,
    expiringProducts,
    dailyMovements,
  ] = await Promise.all([
    // Store name
    db
      .select({ name: stores.name })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1),

    // Stock value by category
    db
      .select({
        categoryName: categories.name,
        categoryIcon: categories.icon,
        totalValue: sql<number>`sum(${products.quantity} * cast(${products.costPrice} as numeric))`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.storeId, storeId))
      .groupBy(categories.name, categories.icon),

    // Top 10 best sellers (by OUT movement count)
    db
      .select({
        productId: stockMovements.productId,
        productName: products.name,
        unitsSold: count(),
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(
        and(
          eq(stockMovements.storeId, storeId),
          eq(stockMovements.type, "OUT")
        )
      )
      .groupBy(stockMovements.productId, products.name)
      .orderBy(desc(count()))
      .limit(10),

    // All products for health summary
    db
      .select({
        id: products.id,
        quantity: products.quantity,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(eq(products.storeId, storeId)),

    // Products expiring in next 30 days
    db
      .select({
        id: products.id,
        name: products.name,
        expiryDate: products.expiryDate,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          gte(products.expiryDate, now.toISOString().split("T")[0]),
          lte(products.expiryDate, thirtyDaysFromNow.toISOString().split("T")[0])
        )
      )
      .orderBy(products.expiryDate),

    // Daily movements for last 7 days
    db
      .select({
        day: sql<string>`date(${stockMovements.createdAt})`,
        type: stockMovements.type,
        movementCount: count(),
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.storeId, storeId),
          gte(stockMovements.createdAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`date(${stockMovements.createdAt})`, stockMovements.type),
  ]);

  const storeName = storeData[0]?.name ?? "Store";

  // Process stock value data
  const categoryValues = stockValueByCategory
    .map((c) => ({
      ...c,
      totalValue: Number(c.totalValue) || 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
  const maxCategoryValue = Math.max(...categoryValues.map((c) => c.totalValue), 1);

  // Process best sellers
  const maxSold = Math.max(...bestSellers.map((b) => b.unitsSold), 1);

  // Process health summary
  const totalProducts = allProducts.length;
  const wellStocked = allProducts.filter(
    (p) => p.quantity > p.lowStockThreshold
  ).length;
  const needsAttention = allProducts.filter(
    (p) => p.quantity <= p.lowStockThreshold && p.quantity > 0
  ).length;
  const outOfStockCount = allProducts.filter(
    (p) => p.quantity === 0
  ).length;

  // Process expiry calendar
  function daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const thisWeek = expiringProducts.filter(
    (p) => p.expiryDate && daysUntil(p.expiryDate) <= 7
  );
  const nextWeek = expiringProducts.filter(
    (p) => p.expiryDate && daysUntil(p.expiryDate) > 7 && daysUntil(p.expiryDate) <= 14
  );
  const thisMonth = expiringProducts.filter(
    (p) => p.expiryDate && daysUntil(p.expiryDate) > 14 && daysUntil(p.expiryDate) <= 30
  );

  // Process daily movements
  const last7Days: { date: string; inCount: number; outCount: number; net: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayIn = dailyMovements
      .filter((m) => m.day === dateStr && m.type === "IN")
      .reduce((sum, m) => sum + m.movementCount, 0);
    const dayOut = dailyMovements
      .filter((m) => m.day === dateStr && m.type === "OUT")
      .reduce((sum, m) => sum + m.movementCount, 0);
    last7Days.push({
      date: dateStr,
      inCount: dayIn,
      outCount: dayOut,
      net: dayIn - dayOut,
    });
  }

  function formatShortDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  }

  function formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-earth-brown">Reports</h1>
        <p className="mt-1 text-sm text-earth-brown/60">{storeName}</p>
      </div>

      {/* Stock Value by Category */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-earth-brown">
          Stock Value by Category
        </h2>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          {categoryValues.length === 0 ? (
            <p className="text-sm text-earth-brown/50">No data available.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {categoryValues.map((cat) => {
                const widthPct = Math.max(
                  (cat.totalValue / maxCategoryValue) * 100,
                  2
                );
                return (
                  <div key={cat.categoryName}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-earth-brown">
                        {cat.categoryIcon} {cat.categoryName}
                      </span>
                      <span className="font-semibold text-beelee-teal">
                        {phpFormat(cat.totalValue)}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-light-gray">
                      <div
                        className="h-3 rounded-full bg-beelee-teal transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Top 10 Best Sellers */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-earth-brown">
          Top 10 Best Sellers
        </h2>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          {bestSellers.length === 0 ? (
            <p className="text-sm text-earth-brown/50">No sales data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {bestSellers.map((item, idx) => {
                const widthPct = Math.max(
                  (item.unitsSold / maxSold) * 100,
                  2
                );
                return (
                  <div key={item.productId} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-right text-sm font-bold text-earth-brown/40">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="truncate font-medium text-earth-brown">
                          {item.productName}
                        </span>
                        <span className="ml-2 shrink-0 font-semibold text-honey-gold">
                          {item.unitsSold} sold
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-light-gray">
                        <div
                          className="h-2 rounded-full bg-honey-gold transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Inventory Health Summary */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-earth-brown">
          Inventory Health Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Well Stocked */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-earth-brown/50">Well Stocked</p>
            <p className="mt-1 text-2xl font-bold text-success">{wellStocked}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-light-gray">
              <div
                className="h-2 rounded-full bg-success transition-all"
                style={{
                  width: `${totalProducts ? (wellStocked / totalProducts) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-earth-brown/40">
              {totalProducts ? Math.round((wellStocked / totalProducts) * 100) : 0}% of{" "}
              {totalProducts} products
            </p>
          </div>

          {/* Needs Attention */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-earth-brown/50">Needs Attention</p>
            <p className="mt-1 text-2xl font-bold text-warm-amber">{needsAttention}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-light-gray">
              <div
                className="h-2 rounded-full bg-warm-amber transition-all"
                style={{
                  width: `${totalProducts ? (needsAttention / totalProducts) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-earth-brown/40">
              {totalProducts ? Math.round((needsAttention / totalProducts) * 100) : 0}% of{" "}
              {totalProducts} products
            </p>
          </div>

          {/* Out of Stock */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-earth-brown/50">Out of Stock</p>
            <p className="mt-1 text-2xl font-bold text-danger">{outOfStockCount}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-light-gray">
              <div
                className="h-2 rounded-full bg-danger transition-all"
                style={{
                  width: `${totalProducts ? (outOfStockCount / totalProducts) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-earth-brown/40">
              {totalProducts ? Math.round((outOfStockCount / totalProducts) * 100) : 0}% of{" "}
              {totalProducts} products
            </p>
          </div>
        </div>
      </section>

      {/* Expiry Calendar */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-earth-brown">
          Expiry Calendar
        </h2>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          {expiringProducts.length === 0 ? (
            <p className="text-sm text-earth-brown/50">
              No products expiring in the next 30 days.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {/* This Week (0-7 days) */}
              {thisWeek.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-danger">
                    <span className="inline-block h-2 w-2 rounded-full bg-danger" />
                    This Week
                  </h3>
                  <div className="flex flex-col gap-2">
                    {thisWeek.map((p) => {
                      const days = daysUntil(p.expiryDate!);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg bg-danger/5 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-earth-brown">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-earth-brown/50">
                              {formatShortDate(p.expiryDate!)}
                            </span>
                            <span className="font-bold text-danger">
                              {days}d
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next Week (8-14 days) */}
              {nextWeek.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-warm-amber">
                    <span className="inline-block h-2 w-2 rounded-full bg-warm-amber" />
                    Next Week
                  </h3>
                  <div className="flex flex-col gap-2">
                    {nextWeek.map((p) => {
                      const days = daysUntil(p.expiryDate!);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg bg-warm-amber/5 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-earth-brown">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-earth-brown/50">
                              {formatShortDate(p.expiryDate!)}
                            </span>
                            <span className="font-bold text-warm-amber">
                              {days}d
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* This Month (15-30 days) */}
              {thisMonth.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-earth-brown/50">
                    <span className="inline-block h-2 w-2 rounded-full bg-earth-brown/30" />
                    This Month
                  </h3>
                  <div className="flex flex-col gap-2">
                    {thisMonth.map((p) => {
                      const days = daysUntil(p.expiryDate!);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-lg bg-light-gray px-3 py-2"
                        >
                          <span className="text-sm font-medium text-earth-brown">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-earth-brown/50">
                              {formatShortDate(p.expiryDate!)}
                            </span>
                            <span className="font-bold text-earth-brown/50">
                              {days}d
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Daily Movement Summary */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-earth-brown">
          Daily Movement Summary
        </h2>
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-light-gray bg-soft-teal/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                  Day
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-success">
                  In
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-danger">
                  Out
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                  Net
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-gray">
              {last7Days.map((day) => (
                <tr key={day.date} className="hover:bg-soft-teal/20">
                  <td className="px-4 py-3 text-sm font-medium text-earth-brown">
                    {formatDayLabel(day.date)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-success">
                    {day.inCount > 0 ? `+${day.inCount}` : "0"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-danger">
                    {day.outCount > 0 ? `-${day.outCount}` : "0"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right text-sm font-bold ${
                      day.net > 0
                        ? "text-success"
                        : day.net < 0
                          ? "text-danger"
                          : "text-earth-brown/40"
                    }`}
                  >
                    {day.net > 0 ? `+${day.net}` : day.net === 0 ? "0" : day.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
