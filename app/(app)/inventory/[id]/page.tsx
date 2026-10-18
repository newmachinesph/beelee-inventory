import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { products, categories, stockMovements } from "../../../lib/schema";
import { eq, and, desc } from "drizzle-orm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product] = await db
    .select({ name: products.name })
    .from(products)
    .where(eq(products.id, Number(id)))
    .limit(1);

  return { title: product?.name ?? "Product" };
}

const UNITS = [
  "piece",
  "sachet",
  "pack",
  "bottle",
  "can",
  "bar",
  "tube",
  "kg",
  "box",
  "cup",
  "stick",
] as const;

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ store?: string }>;
}) {
  const { id } = await params;
  const { store } = await searchParams;
  const storeId = store ? Number(store) : 1;
  const productId = Number(id);

  // Fetch product with category
  const [product] = await db
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
      categoryId: products.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      storeId: products.storeId,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) notFound();

  // Fetch all categories for edit form
  const allCategories = await db.select().from(categories);

  // Fetch stock movements
  const movements = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt));

  // Computed values
  const cost = parseFloat(product.costPrice);
  const sell = parseFloat(product.sellingPrice);
  const marginPct = cost > 0 ? ((sell - cost) / cost) * 100 : 0;
  const now = new Date();
  let daysRemaining: number | null = null;
  if (product.expiryDate) {
    daysRemaining = Math.ceil(
      (new Date(product.expiryDate).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  function qtyColor(qty: number, threshold: number) {
    if (qty === 0) return "text-danger";
    if (qty <= threshold) return "text-warm-amber";
    return "text-success";
  }

  // ── Server Actions ──

  async function adjustStock(formData: FormData) {
    "use server";

    const productId = Number(formData.get("productId"));
    const storeId = Number(formData.get("storeId"));
    const type = formData.get("type") as "IN" | "OUT" | "ADJUSTMENT";
    const quantity = Number(formData.get("quantity"));
    const reason = (formData.get("reason") as string) || null;

    // Get current product quantity
    const [current] = await db
      .select({ quantity: products.quantity })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!current) return;

    let newQty = current.quantity;
    if (type === "IN") {
      newQty = current.quantity + quantity;
    } else if (type === "OUT") {
      newQty = Math.max(0, current.quantity - quantity);
    } else if (type === "ADJUSTMENT") {
      newQty = quantity;
    }

    // Update product quantity
    await db
      .update(products)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(products.id, productId));

    // Insert stock movement
    await db.insert(stockMovements).values({
      productId,
      storeId,
      type,
      quantity,
      reason,
    });

    revalidatePath(`/inventory/${productId}`);
  }

  async function updateProduct(formData: FormData) {
    "use server";

    const productId = Number(formData.get("productId"));
    const storeId = Number(formData.get("storeId"));
    const name = formData.get("name") as string;
    const categoryId = Number(formData.get("categoryId"));
    const barcode = (formData.get("barcode") as string) || null;
    const unit = formData.get("unit") as string;
    const costPrice = formData.get("costPrice") as string;
    const sellingPrice = formData.get("sellingPrice") as string;
    const lowStockThreshold = Number(formData.get("lowStockThreshold") || "5");
    const expiryDate = (formData.get("expiryDate") as string) || null;

    await db
      .update(products)
      .set({
        name,
        categoryId,
        barcode,
        unit,
        costPrice,
        sellingPrice,
        lowStockThreshold,
        expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    revalidatePath(`/inventory/${productId}`);
  }

  // Movement type badge styling
  function typeBadge(type: string) {
    switch (type) {
      case "IN":
        return "bg-success/10 text-success";
      case "OUT":
        return "bg-danger/10 text-danger";
      case "ADJUSTMENT":
        return "bg-honey-gold/20 text-warm-amber";
      default:
        return "bg-light-gray text-earth-brown";
    }
  }

  return (
    <div className="min-h-screen bg-light-gray px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href={`/inventory?store=${storeId}`}
          className="mb-4 inline-block text-sm text-beelee-teal hover:underline"
        >
          &larr; Back to Inventory
        </Link>

        {/* ── Product Header ── */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{product.categoryIcon ?? "📦"}</span>
            <div>
              <h1 className="text-2xl font-bold text-earth-brown">
                {product.name}
              </h1>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-earth-brown/60">
                {product.sku && <span>SKU: {product.sku}</span>}
                {product.barcode && <span>Barcode: {product.barcode}</span>}
                <span>Unit: {product.unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Key Stats ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Current Stock */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-earth-brown/50">
              Current Stock
            </p>
            <p className={`mt-1 text-3xl font-bold ${qtyColor(product.quantity, product.lowStockThreshold)}`}>
              {product.quantity}
            </p>
            <p className="text-xs text-earth-brown/50">
              Threshold: {product.lowStockThreshold}
            </p>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-earth-brown/50">
              Pricing
            </p>
            <div className="mt-1">
              <span className="text-sm text-earth-brown/60">Cost:</span>{" "}
              <span className="font-semibold text-earth-brown">
                &#8369;{cost.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-sm text-earth-brown/60">Sell:</span>{" "}
              <span className="font-bold text-earth-brown">
                &#8369;{sell.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-beelee-teal">
              {marginPct.toFixed(1)}% margin
            </p>
          </div>

          {/* Expiry */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-earth-brown/50">
              Expiry
            </p>
            {product.expiryDate ? (
              <>
                <p className="mt-1 text-lg font-semibold text-earth-brown">
                  {product.expiryDate}
                </p>
                <p
                  className={`text-sm font-semibold ${
                    daysRemaining !== null && daysRemaining <= 0
                      ? "text-danger"
                      : daysRemaining !== null && daysRemaining <= 7
                        ? "text-danger"
                        : "text-success"
                  }`}
                >
                  {daysRemaining !== null && daysRemaining <= 0
                    ? "Expired"
                    : `${daysRemaining} days remaining`}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-earth-brown/40">No expiry set</p>
            )}
          </div>
        </div>

        {/* ── Quick Actions: Adjust Stock ── */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-earth-brown">
            Adjust Stock
          </h2>
          <form action={adjustStock} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="storeId" value={storeId} />

            <div className="flex-shrink-0">
              <label htmlFor="adjust-type" className="mb-1 block text-xs font-semibold text-earth-brown/60">
                Type
              </label>
              <select
                id="adjust-type"
                name="type"
                required
                className="rounded-xl border border-earth-brown/20 bg-white px-3 py-2 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>
            </div>

            <div className="w-24">
              <label htmlFor="adjust-qty" className="mb-1 block text-xs font-semibold text-earth-brown/60">
                Qty
              </label>
              <input
                type="number"
                id="adjust-qty"
                name="quantity"
                required
                min="0"
                className="w-full rounded-xl border border-earth-brown/20 px-3 py-2 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>

            <div className="flex-1">
              <label htmlFor="adjust-reason" className="mb-1 block text-xs font-semibold text-earth-brown/60">
                Reason
              </label>
              <input
                type="text"
                id="adjust-reason"
                name="reason"
                placeholder="e.g. Restocked from supplier"
                className="w-full rounded-xl border border-earth-brown/20 px-3 py-2 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-beelee-teal px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Submit
            </button>
          </form>
        </div>

        {/* ── Stock History ── */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-earth-brown">
            Stock History
          </h2>
          {movements.length === 0 ? (
            <p className="text-sm text-earth-brown/50">No stock movements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-earth-brown/10 text-left text-xs font-semibold uppercase tracking-wider text-earth-brown/60">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-brown/5">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-earth-brown/70">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadge(m.type)}`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-earth-brown">
                        {m.quantity}
                      </td>
                      <td className="px-3 py-2 text-earth-brown/60">
                        {m.reason ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Edit Product ── */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-earth-brown">
            Edit Product
          </h2>
          <form action={updateProduct} className="space-y-4">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="storeId" value={storeId} />

            <div>
              <label htmlFor="edit-name" className="mb-1 block text-sm font-semibold text-earth-brown">
                Product Name
              </label>
              <input
                type="text"
                id="edit-name"
                name="name"
                required
                defaultValue={product.name}
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>

            <div>
              <label htmlFor="edit-category" className="mb-1 block text-sm font-semibold text-earth-brown">
                Category
              </label>
              <select
                id="edit-category"
                name="categoryId"
                required
                defaultValue={product.categoryId}
                className="w-full rounded-xl border border-earth-brown/20 bg-white px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              >
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-barcode" className="mb-1 block text-sm font-semibold text-earth-brown">
                Barcode
              </label>
              <input
                type="text"
                id="edit-barcode"
                name="barcode"
                defaultValue={product.barcode ?? ""}
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>

            <div>
              <label htmlFor="edit-unit" className="mb-1 block text-sm font-semibold text-earth-brown">
                Unit
              </label>
              <select
                id="edit-unit"
                name="unit"
                required
                defaultValue={product.unit}
                className="w-full rounded-xl border border-earth-brown/20 bg-white px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-cost" className="mb-1 block text-sm font-semibold text-earth-brown">
                  Cost Price (&#8369;)
                </label>
                <input
                  type="number"
                  id="edit-cost"
                  name="costPrice"
                  required
                  min="0"
                  step="0.01"
                  defaultValue={cost.toFixed(2)}
                  className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                />
              </div>
              <div>
                <label htmlFor="edit-sell" className="mb-1 block text-sm font-semibold text-earth-brown">
                  Selling Price (&#8369;)
                </label>
                <input
                  type="number"
                  id="edit-sell"
                  name="sellingPrice"
                  required
                  min="0"
                  step="0.01"
                  defaultValue={sell.toFixed(2)}
                  className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-threshold" className="mb-1 block text-sm font-semibold text-earth-brown">
                Low Stock Threshold
              </label>
              <input
                type="number"
                id="edit-threshold"
                name="lowStockThreshold"
                min="0"
                defaultValue={product.lowStockThreshold}
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>

            <div>
              <label htmlFor="edit-expiry" className="mb-1 block text-sm font-semibold text-earth-brown">
                Expiry Date
              </label>
              <input
                type="date"
                id="edit-expiry"
                name="expiryDate"
                defaultValue={product.expiryDate ?? ""}
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-honey-gold px-6 py-2.5 text-sm font-semibold text-earth-brown transition hover:opacity-90"
            >
              Update Product
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
