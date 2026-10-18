import { db } from "../../lib/db";
import { products, stockMovements, alerts, stores, categories } from "../../lib/schema";
import { eq, and, sql, lte, gte, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

const phpFormat = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const storeId = Number(params.store) || 1;

  // Run all queries in parallel
  const [
    storeInfo,
    totalProductsResult,
    stockValueResult,
    lowStockCountResult,
    outOfStockCountResult,
    expiringSoonCountResult,
    recentMovements,
    lowStockProducts,
  ] = await Promise.all([
    // Store info
    db
      .select({ name: stores.name, ownerName: stores.ownerName })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1),

    // Total products count
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.storeId, storeId)),

    // Total stock value
    db
      .select({
        value: sql<string>`coalesce(sum(${products.quantity} * ${products.costPrice}), 0)`,
      })
      .from(products)
      .where(eq(products.storeId, storeId)),

    // Low stock count (quantity <= threshold AND quantity > 0)
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          sql`${products.quantity} <= ${products.lowStockThreshold}`,
          sql`${products.quantity} > 0`
        )
      ),

    // Out of stock count
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.storeId, storeId), eq(products.quantity, 0))),

    // Expiring soon count (within 7 days)
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          sql`${products.expiryDate} is not null`,
          lte(products.expiryDate, sql`current_date + interval '7 days'`),
          gte(products.expiryDate, sql`current_date`)
        )
      ),

    // Recent stock movements (last 10, with product name)
    db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        createdAt: stockMovements.createdAt,
        productName: products.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(eq(stockMovements.storeId, storeId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(10),

    // Top 5 low stock products
    db
      .select({
        id: products.id,
        name: products.name,
        quantity: products.quantity,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          sql`${products.quantity} <= ${products.lowStockThreshold}`
        )
      )
      .orderBy(products.quantity)
      .limit(5),
  ]);

  const store = storeInfo[0] ?? { name: "Store", ownerName: "Owner" };
  const totalProducts = Number(totalProductsResult[0]?.count ?? 0);
  const stockValue = Number(stockValueResult[0]?.value ?? 0);
  const lowStockCount = Number(lowStockCountResult[0]?.count ?? 0);
  const outOfStockCount = Number(outOfStockCountResult[0]?.count ?? 0);
  const expiringSoonCount = Number(expiringSoonCountResult[0]?.count ?? 0);

  const currentDate = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const movementBadge: Record<string, { label: string; classes: string }> = {
    IN: { label: "IN", classes: "bg-success/10 text-success" },
    OUT: { label: "OUT", classes: "bg-danger/10 text-danger" },
    ADJUSTMENT: { label: "ADJUSTMENT", classes: "bg-warm-amber/10 text-warm-amber" },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header + Quick Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-earth-brown">Dashboard</h1>
          <p className="mt-1 text-lg text-earth-brown/70">{store.name}</p>
          <p className="text-sm text-earth-brown/50">{currentDate}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/inventory/add?store=${storeId}`}
            className="inline-flex items-center rounded-xl bg-beelee-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-beelee-teal/90"
          >
            + Add Product
          </Link>
          <Link
            href={`/inventory?store=${storeId}`}
            className="inline-flex items-center rounded-xl bg-honey-gold px-5 py-2.5 text-sm font-bold text-earth-brown shadow-sm transition-colors hover:bg-honey-gold/90"
          >
            View Inventory
          </Link>
          <Link
            href={`/alerts?store=${storeId}`}
            className="inline-flex items-center rounded-xl bg-warm-amber px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-warm-amber/90"
          >
            View Alerts
          </Link>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Products */}
        <div className="rounded-2xl border-l-4 border-beelee-teal bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-earth-brown/60">Total Products</p>
              <p className="mt-1 text-2xl font-bold text-earth-brown">{totalProducts}</p>
            </div>
            <span className="text-3xl" aria-hidden="true">
              📦
            </span>
          </div>
        </div>

        {/* Stock Value */}
        <div className="rounded-2xl border-l-4 border-honey-gold bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-earth-brown/60">Stock Value</p>
              <p className="mt-1 text-2xl font-bold text-earth-brown">
                {phpFormat.format(stockValue)}
              </p>
            </div>
            <span className="text-3xl" aria-hidden="true">
              💰
            </span>
          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-2xl border-l-4 border-warm-amber bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-earth-brown/60">Low Stock</p>
              <p className="mt-1 text-2xl font-bold text-earth-brown">{lowStockCount}</p>
            </div>
            <span className="text-3xl" aria-hidden="true">
              ⚠️
            </span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="rounded-2xl border-l-4 border-danger bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-earth-brown/60">Expiring Soon</p>
              <p className="mt-1 text-2xl font-bold text-earth-brown">{expiringSoonCount}</p>
            </div>
            <span className="text-3xl" aria-hidden="true">
              🔴
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Low Stock Alert */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-earth-brown">Low Stock Alert</h2>

          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-earth-brown/50">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-light-gray">
              {lowStockProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-earth-brown">{product.name}</p>
                    <p className="text-sm text-earth-brown/60">
                      Qty: <span className="font-medium">{product.quantity}</span> / Threshold:{" "}
                      <span className="font-medium">{product.lowStockThreshold}</span>
                    </p>
                    {product.quantity === 0 && (
                      <span className="mt-1 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/inventory/${product.id}?store=${storeId}`}
                    className="ml-4 shrink-0 text-sm font-semibold text-beelee-teal hover:underline"
                  >
                    Restock →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Recent Activity */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-earth-brown">Recent Activity</h2>

          {recentMovements.length === 0 ? (
            <p className="text-sm text-earth-brown/50">No recent stock movements.</p>
          ) : (
            <ul className="divide-y divide-light-gray">
              {recentMovements.map((movement) => {
                const badge = movementBadge[movement.type] ?? movementBadge.ADJUSTMENT;
                return (
                  <li
                    key={movement.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-earth-brown">
                        {movement.productName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-earth-brown/60">
                          Qty: <span className="font-medium">{movement.quantity}</span>
                        </span>
                      </div>
                      {movement.reason && (
                        <p className="mt-0.5 truncate text-xs text-earth-brown/50">
                          {movement.reason}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-earth-brown/40">
                      {timeAgo(new Date(movement.createdAt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
