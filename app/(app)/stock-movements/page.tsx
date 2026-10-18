import { db } from "../../lib/db";
import { stockMovements, products } from "../../lib/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Movements",
};

const TYPE_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Stock In", value: "IN" },
  { label: "Stock Out", value: "OUT" },
  { label: "Adjustments", value: "ADJUSTMENT" },
] as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  }) + ", " + date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function typeBadgeClasses(type: string): string {
  switch (type) {
    case "IN":
      return "bg-success/10 text-success";
    case "OUT":
      return "bg-danger/10 text-danger";
    case "ADJUSTMENT":
      return "bg-warm-amber/10 text-warm-amber";
    default:
      return "bg-light-gray text-earth-brown";
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "IN":
      return "IN";
    case "OUT":
      return "OUT";
    case "ADJUSTMENT":
      return "ADJUST";
    default:
      return type;
  }
}

function quantityPrefix(type: string): string {
  switch (type) {
    case "IN":
      return "+";
    case "OUT":
      return "-";
    default:
      return "";
  }
}

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const storeId = Number(params.store) || 1;
  const typeFilter = (params.type as string) || "ALL";
  const currentPage = Math.max(1, Number(params.page) || 1);
  const perPage = 25;

  const conditions = [eq(stockMovements.storeId, storeId)];
  if (typeFilter !== "ALL") {
    conditions.push(
      eq(stockMovements.type, typeFilter as "IN" | "OUT" | "ADJUSTMENT")
    );
  }

  const [movements, totalResult] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        createdAt: stockMovements.createdAt,
        productId: stockMovements.productId,
        productName: products.name,
      })
      .from(stockMovements)
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(perPage)
      .offset((currentPage - 1) * perPage),
    db
      .select({ total: count() })
      .from(stockMovements)
      .where(and(...conditions)),
  ]);

  const totalCount = totalResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-earth-brown">
          Stock Movements
        </h1>
        <p className="mt-1 text-sm text-earth-brown/60">
          {totalCount} total movement{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => {
          const isActive = typeFilter === filter.value;
          const href =
            filter.value === "ALL"
              ? `?store=${storeId}`
              : `?store=${storeId}&type=${filter.value}`;
          return (
            <a
              key={filter.value}
              href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-beelee-teal text-white"
                  : "bg-white text-earth-brown hover:bg-soft-teal"
              }`}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      {/* Movements List */}
      {movements.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center">
          <p className="text-lg font-semibold text-earth-brown/50">
            No movements found
          </p>
          <p className="mt-1 text-sm text-earth-brown/40">
            Try a different filter or check back later.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {movements.map((m) => (
              <div
                key={m.id}
                className="rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <a
                      href={`/inventory/${m.productId}?store=${storeId}`}
                      className="font-semibold text-beelee-teal hover:underline"
                    >
                      {m.productName}
                    </a>
                    <p className="mt-0.5 text-xs text-earth-brown/50">
                      {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${typeBadgeClasses(m.type)}`}
                  >
                    {typeLabel(m.type)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-earth-brown/60">
                    {m.reason || "No reason provided"}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      m.type === "IN"
                        ? "text-success"
                        : m.type === "OUT"
                          ? "text-danger"
                          : "text-warm-amber"
                    }`}
                  >
                    {quantityPrefix(m.type)}{m.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-light-gray bg-soft-teal/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                    Date/Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-soft-teal/20">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-earth-brown/60">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/inventory/${m.productId}?store=${storeId}`}
                        className="text-sm font-semibold text-beelee-teal hover:underline"
                      >
                        {m.productName}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${typeBadgeClasses(m.type)}`}
                      >
                        {typeLabel(m.type)}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${
                        m.type === "IN"
                          ? "text-success"
                          : m.type === "OUT"
                            ? "text-danger"
                            : "text-warm-amber"
                      }`}
                    >
                      {quantityPrefix(m.type)}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-earth-brown/60">
                      {m.reason || "No reason provided"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between rounded-xl bg-white px-6 py-4 shadow-sm">
              <p className="text-sm text-earth-brown/60">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`/stock-movements?store=${storeId}&type=${typeFilter}&page=${currentPage - 1}`}
                    className="rounded-lg bg-light-gray px-4 py-2 text-sm font-semibold text-earth-brown hover:bg-soft-teal transition"
                  >
                    ← Prev
                  </a>
                )}
                {currentPage < totalPages && (
                  <a
                    href={`/stock-movements?store=${storeId}&type=${typeFilter}&page=${currentPage + 1}`}
                    className="rounded-lg bg-light-gray px-4 py-2 text-sm font-semibold text-earth-brown hover:bg-soft-teal transition"
                  >
                    Next →
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
