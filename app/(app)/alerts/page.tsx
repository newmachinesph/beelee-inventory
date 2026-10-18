import { db } from "../../lib/db";
import { alerts, products } from "../../lib/schema";
import { eq, and, sql, count } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alerts",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const storeId = Number(params.store) || 1;

  const activeAlerts = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      status: alerts.status,
      createdAt: alerts.createdAt,
      productId: alerts.productId,
      productName: products.name,
      productQuantity: products.quantity,
      productThreshold: products.lowStockThreshold,
      productExpiry: products.expiryDate,
    })
    .from(alerts)
    .innerJoin(products, eq(alerts.productId, products.id))
    .where(
      and(eq(alerts.storeId, storeId), eq(alerts.status, "ACTIVE"))
    );

  const outOfStock = activeAlerts.filter((a) => a.type === "OUT_OF_STOCK");
  const lowStock = activeAlerts.filter((a) => a.type === "LOW_STOCK");
  const expiring = activeAlerts.filter((a) => a.type === "EXPIRING");

  const totalActive = activeAlerts.length;

  function daysRemaining(expiryDate: string | null): number {
    if (!expiryDate) return 0;
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function formatExpiryDate(dateStr: string | null): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-earth-brown">Alerts</h1>
        <p className="mt-1 text-sm text-earth-brown/60">
          {totalActive} active alert{totalActive !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Alert Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Out of Stock */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
              <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-danger">{outOfStock.length}</p>
              <p className="text-xs font-medium text-earth-brown/50">Out of Stock</p>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warm-amber/10">
              <svg className="h-5 w-5 text-warm-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-amber">{lowStock.length}</p>
              <p className="text-xs font-medium text-earth-brown/50">Low Stock</p>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
              <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-danger">{expiring.length}</p>
              <p className="text-xs font-medium text-earth-brown/50">Expiring Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* No Alerts State */}
      {totalActive === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-bold text-success">All clear!</p>
          <p className="mt-1 text-sm text-earth-brown/50">
            No alerts for your store.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Out of Stock Section */}
          {outOfStock.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-danger">
                Out of Stock ({outOfStock.length})
              </h2>
              <div className="flex flex-col gap-3">
                {outOfStock.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border-l-4 border-danger bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-earth-brown">
                          {alert.productName}
                        </p>
                        <p className="mt-0.5 text-sm text-danger font-medium">
                          0 in stock
                        </p>
                      </div>
                      <a
                        href={`/inventory/${alert.productId}?store=${storeId}`}
                        className="shrink-0 rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors"
                      >
                        Restock now &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Low Stock Section */}
          {lowStock.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-warm-amber">
                Low Stock ({lowStock.length})
              </h2>
              <div className="flex flex-col gap-3">
                {lowStock.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border-l-4 border-warm-amber bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-earth-brown">
                          {alert.productName}
                        </p>
                        <p className="mt-0.5 text-sm text-warm-amber font-medium">
                          {alert.productQuantity} / {alert.productThreshold} threshold
                        </p>
                      </div>
                      <a
                        href={`/inventory/${alert.productId}?store=${storeId}`}
                        className="shrink-0 rounded-lg bg-warm-amber/10 px-3 py-1.5 text-sm font-semibold text-warm-amber hover:bg-warm-amber/20 transition-colors"
                      >
                        View &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Expiring Soon Section */}
          {expiring.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-danger">
                Expiring Soon ({expiring.length})
              </h2>
              <div className="flex flex-col gap-3">
                {expiring.map((alert) => {
                  const days = daysRemaining(alert.productExpiry);
                  return (
                    <div
                      key={alert.id}
                      className="rounded-xl border-l-4 border-warm-amber bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-earth-brown">
                            {alert.productName}
                          </p>
                          <p className="mt-0.5 text-sm text-earth-brown/60">
                            Expires {formatExpiryDate(alert.productExpiry)}
                            <span className="ml-2 font-semibold text-danger">
                              {days} day{days !== 1 ? "s" : ""} remaining
                            </span>
                          </p>
                        </div>
                        <a
                          href={`/inventory/${alert.productId}?store=${storeId}`}
                          className="shrink-0 rounded-lg bg-warm-amber/10 px-3 py-1.5 text-sm font-semibold text-warm-amber hover:bg-warm-amber/20 transition-colors"
                        >
                          View &rarr;
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
