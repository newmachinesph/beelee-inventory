import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { products, categories, stockMovements } from "../../../lib/schema";

export const metadata = { title: "Add Product" };

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

export default async function AddProductPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store } = await searchParams;
  const storeId = store ? Number(store) : 1;

  const allCategories = await db.select().from(categories);

  async function createProduct(formData: FormData) {
    "use server";

    const storeId = Number(formData.get("storeId"));
    const name = formData.get("name") as string;
    const categoryId = Number(formData.get("categoryId"));
    const barcode = (formData.get("barcode") as string) || null;
    const unit = formData.get("unit") as string;
    const costPrice = formData.get("costPrice") as string;
    const sellingPrice = formData.get("sellingPrice") as string;
    const initialQuantity = Number(formData.get("initialQuantity") || "0");
    const lowStockThreshold = Number(formData.get("lowStockThreshold") || "5");
    const expiryDate = (formData.get("expiryDate") as string) || null;

    // Insert product
    const [newProduct] = await db
      .insert(products)
      .values({
        storeId,
        categoryId,
        name,
        barcode,
        unit,
        costPrice,
        sellingPrice,
        quantity: initialQuantity,
        lowStockThreshold,
        expiryDate,
      })
      .returning({ id: products.id });

    // Create initial stock movement if quantity > 0
    if (initialQuantity > 0) {
      await db.insert(stockMovements).values({
        productId: newProduct.id,
        storeId,
        type: "IN",
        quantity: initialQuantity,
        reason: "Initial stock",
      });
    }

    redirect(`/inventory?store=${storeId}`);
  }

  return (
    <div className="min-h-screen bg-light-gray px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/inventory?store=${storeId}`}
            className="text-sm text-beelee-teal hover:underline"
          >
            &larr; Back to Inventory
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-earth-brown">
            Add Product
          </h1>
        </div>

        {/* Form */}
        <form action={createProduct} className="rounded-2xl bg-white p-8 shadow-sm">
          <input type="hidden" name="storeId" value={storeId} />

          <div className="space-y-5">
            {/* Product Name */}
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-semibold text-earth-brown">
                Product Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                placeholder="e.g. Lucky Me Pancit Canton"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="categoryId" className="mb-1 block text-sm font-semibold text-earth-brown">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                className="w-full rounded-xl border border-earth-brown/20 bg-white px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              >
                <option value="">Select category...</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Barcode */}
            <div>
              <label htmlFor="barcode" className="mb-1 block text-sm font-semibold text-earth-brown">
                Barcode
              </label>
              <input
                type="text"
                id="barcode"
                name="barcode"
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                placeholder="Scan or enter barcode"
              />
            </div>

            {/* Unit */}
            <div>
              <label htmlFor="unit" className="mb-1 block text-sm font-semibold text-earth-brown">
                Unit <span className="text-danger">*</span>
              </label>
              <select
                id="unit"
                name="unit"
                required
                defaultValue="piece"
                className="w-full rounded-xl border border-earth-brown/20 bg-white px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost & Selling Price - side by side */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="costPrice" className="mb-1 block text-sm font-semibold text-earth-brown">
                  Cost Price (&#8369;) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="costPrice"
                  name="costPrice"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="sellingPrice" className="mb-1 block text-sm font-semibold text-earth-brown">
                  Selling Price (&#8369;) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  id="sellingPrice"
                  name="sellingPrice"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quantity & Threshold - side by side */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="initialQuantity" className="mb-1 block text-sm font-semibold text-earth-brown">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  id="initialQuantity"
                  name="initialQuantity"
                  min="0"
                  defaultValue={0}
                  className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                />
              </div>
              <div>
                <label htmlFor="lowStockThreshold" className="mb-1 block text-sm font-semibold text-earth-brown">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  min="0"
                  defaultValue={5}
                  className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown placeholder:text-earth-brown/40 focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label htmlFor="expiryDate" className="mb-1 block text-sm font-semibold text-earth-brown">
                Expiry Date
              </label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                className="w-full rounded-xl border border-earth-brown/20 px-4 py-2.5 text-sm text-earth-brown focus:border-beelee-teal focus:ring-1 focus:ring-beelee-teal"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-beelee-teal px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Save Product
            </button>
            <Link
              href={`/inventory?store=${storeId}`}
              className="rounded-xl border border-earth-brown/20 px-6 py-2.5 text-sm font-semibold text-earth-brown transition hover:bg-light-gray"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
