import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  stores,
  categories,
  products,
  stockMovements,
  suppliers,
  alerts,
} from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const CATEGORIES = [
  { name: "Beverages", icon: "🥤" },
  { name: "Canned Goods", icon: "🥫" },
  { name: "Snacks", icon: "🍿" },
  { name: "Noodles", icon: "🍜" },
  { name: "Condiments", icon: "🧂" },
  { name: "Personal Care", icon: "🧴" },
  { name: "Household", icon: "🧹" },
  { name: "Rice & Grains", icon: "🍚" },
  { name: "Frozen & Chilled", icon: "🧊" },
  { name: "Tobacco & Others", icon: "📦" },
];

const DEMO_STORES = [
  { name: "Aling Maria's Tindahan", ownerName: "Maria Santos", location: "Brgy. Pinyahan, Quezon City" },
  { name: "Mang Pedro's Store", ownerName: "Pedro Reyes", location: "Brgy. San Andres, Cainta, Rizal" },
  { name: "Ate Jenny's Sari-Sari", ownerName: "Jenny Lim", location: "Brgy. Talomo, Davao City" },
];

// Realistic sari-sari products with Filipino brands
const PRODUCTS_TEMPLATE = [
  // Beverages (cat 1)
  { name: "Coca-Cola Mismo 295ml", cat: 1, cost: 12, sell: 15, unit: "bottle", barcode: "4800010001" },
  { name: "Royal Tru-Orange 250ml", cat: 1, cost: 10, sell: 13, unit: "bottle", barcode: "4800010002" },
  { name: "C2 Apple Green Tea 230ml", cat: 1, cost: 11, sell: 15, unit: "bottle", barcode: "4800010003" },
  { name: "Bear Brand Adult Plus 33g", cat: 1, cost: 12, sell: 15, unit: "sachet", barcode: "4800010004" },
  { name: "Milo 22g Sachet", cat: 1, cost: 8, sell: 10, unit: "sachet", barcode: "4800010005" },
  { name: "Nescafe 3-in-1 Original 28g", cat: 1, cost: 7, sell: 9, unit: "sachet", barcode: "4800010006" },
  { name: "Kopiko Brown 25g", cat: 1, cost: 6, sell: 8, unit: "sachet", barcode: "4800010007" },
  { name: "Zest-O Orange Juice 200ml", cat: 1, cost: 6, sell: 8, unit: "pack", barcode: "4800010008" },
  // Canned Goods (cat 2)
  { name: "Argentina Corned Beef 150g", cat: 2, cost: 28, sell: 35, unit: "can", barcode: "4800020001" },
  { name: "Century Tuna Flakes 155g", cat: 2, cost: 25, sell: 32, unit: "can", barcode: "4800020002" },
  { name: "555 Sardines Hot 155g", cat: 2, cost: 18, sell: 23, unit: "can", barcode: "4800020003" },
  { name: "Mega Sardines 155g", cat: 2, cost: 16, sell: 20, unit: "can", barcode: "4800020004" },
  { name: "CDO Liver Spread 85g", cat: 2, cost: 15, sell: 20, unit: "can", barcode: "4800020005" },
  // Snacks (cat 3)
  { name: "Boy Bawang Cornick Garlic 100g", cat: 3, cost: 15, sell: 20, unit: "pack", barcode: "4800030001" },
  { name: "Piattos Cheese 85g", cat: 3, cost: 18, sell: 25, unit: "pack", barcode: "4800030002" },
  { name: "Nova Country Cheddar 78g", cat: 3, cost: 16, sell: 22, unit: "pack", barcode: "4800030003" },
  { name: "SkyFlakes Crackers 25g", cat: 3, cost: 5, sell: 7, unit: "pack", barcode: "4800030004" },
  { name: "Chippy Barbecue 110g", cat: 3, cost: 16, sell: 22, unit: "pack", barcode: "4800030005" },
  { name: "Lala Fish Crackers 100g", cat: 3, cost: 10, sell: 15, unit: "pack", barcode: "4800030006" },
  // Noodles (cat 4)
  { name: "Lucky Me Pancit Canton Original 60g", cat: 4, cost: 9, sell: 12, unit: "pack", barcode: "4800040001" },
  { name: "Lucky Me Pancit Canton Chilimansi 60g", cat: 4, cost: 9, sell: 12, unit: "pack", barcode: "4800040002" },
  { name: "Payless Pancit Canton 60g", cat: 4, cost: 7, sell: 10, unit: "pack", barcode: "4800040003" },
  { name: "Lucky Me Instant Mami Beef 55g", cat: 4, cost: 8, sell: 11, unit: "pack", barcode: "4800040004" },
  { name: "Nissin Cup Noodles Seafood 60g", cat: 4, cost: 22, sell: 28, unit: "cup", barcode: "4800040005" },
  // Condiments (cat 5)
  { name: "Datu Puti Vinegar 385ml", cat: 5, cost: 18, sell: 23, unit: "bottle", barcode: "4800050001" },
  { name: "Silver Swan Soy Sauce 385ml", cat: 5, cost: 20, sell: 25, unit: "bottle", barcode: "4800050002" },
  { name: "UFC Banana Ketchup 320g", cat: 5, cost: 25, sell: 32, unit: "bottle", barcode: "4800050003" },
  { name: "Maggi Magic Sarap 8g", cat: 5, cost: 2, sell: 3, unit: "sachet", barcode: "4800050004" },
  { name: "Knorr Sinigang Mix 22g", cat: 5, cost: 10, sell: 13, unit: "sachet", barcode: "4800050005" },
  // Personal Care (cat 6)
  { name: "Safeguard Soap Lemon Fresh 135g", cat: 6, cost: 32, sell: 40, unit: "bar", barcode: "4800060001" },
  { name: "Head & Shoulders Shampoo 12ml", cat: 6, cost: 5, sell: 7, unit: "sachet", barcode: "4800060002" },
  { name: "Colgate Triple Action 50ml", cat: 6, cost: 22, sell: 28, unit: "tube", barcode: "4800060003" },
  { name: "Palmolive Shampoo 15ml", cat: 6, cost: 5, sell: 7, unit: "sachet", barcode: "4800060004" },
  { name: "Rexona Deo Spray 25ml", cat: 6, cost: 45, sell: 55, unit: "can", barcode: "4800060005" },
  // Household (cat 7)
  { name: "Surf Powder Detergent 66g", cat: 7, cost: 8, sell: 11, unit: "sachet", barcode: "4800070001" },
  { name: "Joy Dishwashing Liquid 22ml", cat: 7, cost: 5, sell: 7, unit: "sachet", barcode: "4800070002" },
  { name: "Domex Bleach 250ml", cat: 7, cost: 28, sell: 35, unit: "bottle", barcode: "4800070003" },
  { name: "Zonrox Bleach 250ml", cat: 7, cost: 22, sell: 28, unit: "bottle", barcode: "4800070004" },
  // Rice & Grains (cat 8)
  { name: "NFA Rice 1kg (Tingi)", cat: 8, cost: 38, sell: 45, unit: "kg", barcode: "4800080001" },
  { name: "Jasmine Rice 1kg (Tingi)", cat: 8, cost: 48, sell: 56, unit: "kg", barcode: "4800080002" },
  { name: "Brown Rice 1kg (Tingi)", cat: 8, cost: 55, sell: 65, unit: "kg", barcode: "4800080003" },
  { name: "Pancake Mix Maya 200g", cat: 8, cost: 28, sell: 35, unit: "pack", barcode: "4800080004" },
  // Frozen & Chilled (cat 9)
  { name: "Tender Juicy Hotdog Classic 230g", cat: 9, cost: 55, sell: 68, unit: "pack", barcode: "4800090001" },
  { name: "CDO Karne Norte 150g", cat: 9, cost: 30, sell: 38, unit: "pack", barcode: "4800090002" },
  { name: "Magnolia Ice Cream Bar", cat: 9, cost: 12, sell: 15, unit: "piece", barcode: "4800090003" },
  // Tobacco & Others (cat 10)
  { name: "Marlboro Red (Per Stick)", cat: 10, cost: 7, sell: 9, unit: "stick", barcode: "4800100001" },
  { name: "Fortune Cigarettes (Per Stick)", cat: 10, cost: 5, sell: 7, unit: "stick", barcode: "4800100002" },
  { name: "Happee Toothbrush", cat: 10, cost: 12, sell: 18, unit: "piece", barcode: "4800100003" },
  { name: "Plastic Bag (Small) 100pcs", cat: 10, cost: 35, sell: 45, unit: "pack", barcode: "4800100004" },
  { name: "Match Box Tiger", cat: 10, cost: 2, sell: 3, unit: "box", barcode: "4800100005" },
];

// Store-specific quantity profiles
const STORE_PROFILES = [
  // Aling Maria — well-stocked
  (i: number) => ({ qty: 20 + Math.floor(Math.random() * 60), threshold: 10, expiryOffset: 30 + Math.floor(Math.random() * 90) }),
  // Mang Pedro — some low stock
  (i: number) => ({ qty: i % 3 === 0 ? Math.floor(Math.random() * 4) : 10 + Math.floor(Math.random() * 30), threshold: 8, expiryOffset: 15 + Math.floor(Math.random() * 60) }),
  // Ate Jenny — post-typhoon, many expiring
  (i: number) => ({ qty: i % 4 === 0 ? 0 : Math.floor(Math.random() * 20), threshold: 5, expiryOffset: i % 3 === 0 ? Math.floor(Math.random() * 7) : 20 + Math.floor(Math.random() * 40) }),
];

async function seed() {
  console.log("🐝 Seeding BeeLee Inventory database...\n");

  // Clear existing data
  console.log("Clearing existing data...");
  await db.delete(alerts);
  await db.delete(stockMovements);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(categories);
  await db.delete(stores);

  // Seed categories
  console.log("Seeding categories...");
  const catRows = await db.insert(categories).values(CATEGORIES).returning();
  console.log(`  ✓ ${catRows.length} categories`);

  // Seed stores
  console.log("Seeding stores...");
  const storeRows = await db.insert(stores).values(DEMO_STORES).returning();
  console.log(`  ✓ ${storeRows.length} stores`);

  // Seed suppliers per store
  console.log("Seeding suppliers...");
  const supplierData = storeRows.flatMap((store) => [
    { storeId: store.id, name: "Metro Manila Distributors", contact: "09171234567", notes: "Main FMCG supplier" },
    { storeId: store.id, name: "Local Bakery Supplier", contact: "09181234567", notes: "Bread and pastries" },
    { storeId: store.id, name: "Beverage Distributor", contact: "09191234567", notes: "Coke, Pepsi, C2" },
  ]);
  await db.insert(suppliers).values(supplierData);
  console.log(`  ✓ ${supplierData.length} suppliers`);

  // Seed products per store
  console.log("Seeding products...");
  let totalProducts = 0;
  const allProducts: { id: number; storeId: number; quantity: number; lowStockThreshold: number; expiryDate: string | null }[] = [];

  for (let si = 0; si < storeRows.length; si++) {
    const store = storeRows[si];
    const profile = STORE_PROFILES[si];

    const productValues = PRODUCTS_TEMPLATE.map((p, pi) => {
      const { qty, threshold, expiryOffset } = profile(pi);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expiryOffset);

      return {
        storeId: store.id,
        categoryId: catRows[p.cat - 1].id,
        name: p.name,
        barcode: p.barcode,
        sku: `SKU-${store.id}-${String(pi + 1).padStart(3, "0")}`,
        unit: p.unit,
        costPrice: String(p.cost),
        sellingPrice: String(p.sell),
        quantity: qty,
        lowStockThreshold: threshold,
        expiryDate: expiry.toISOString().split("T")[0],
      };
    });

    const insertedProducts = await db.insert(products).values(productValues).returning();
    insertedProducts.forEach((p) => {
      allProducts.push({
        id: p.id,
        storeId: p.storeId,
        quantity: p.quantity,
        lowStockThreshold: p.lowStockThreshold,
        expiryDate: p.expiryDate,
      });
    });
    totalProducts += insertedProducts.length;
  }
  console.log(`  ✓ ${totalProducts} products`);

  // Seed stock movements (recent activity)
  console.log("Seeding stock movements...");
  const movementValues: {
    productId: number;
    storeId: number;
    type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    reason: string;
    createdAt: Date;
  }[] = [];

  const reasons = {
    IN: ["Restock from supplier", "Delivery received", "Wholesale order arrived", "Manual count adjustment"],
    OUT: ["Customer purchase", "Sold to suki", "Bundle promo sold", "Expired - removed"],
    ADJUSTMENT: ["Inventory count correction", "Damaged goods removed", "Found extra stock"],
  };

  for (const p of allProducts) {
    const numMovements = 3 + Math.floor(Math.random() * 8);
    for (let m = 0; m < numMovements; m++) {
      const types: ("IN" | "OUT" | "ADJUSTMENT")[] = ["IN", "OUT", "OUT", "OUT", "ADJUSTMENT"];
      const type = types[Math.floor(Math.random() * types.length)];
      const reasonList = reasons[type];
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(6 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));

      movementValues.push({
        productId: p.id,
        storeId: p.storeId,
        type,
        quantity: type === "IN" ? 5 + Math.floor(Math.random() * 20) : 1 + Math.floor(Math.random() * 5),
        reason: reasonList[Math.floor(Math.random() * reasonList.length)],
        createdAt: date,
      });
    }
  }

  // Insert in batches
  for (let i = 0; i < movementValues.length; i += 50) {
    await db.insert(stockMovements).values(movementValues.slice(i, i + 50));
  }
  console.log(`  ✓ ${movementValues.length} stock movements`);

  // Seed alerts
  console.log("Seeding alerts...");
  const alertValues: {
    storeId: number;
    productId: number;
    type: "LOW_STOCK" | "EXPIRING" | "OUT_OF_STOCK";
    status: "ACTIVE" | "DISMISSED";
  }[] = [];

  const now = new Date();
  for (const p of allProducts) {
    if (p.quantity === 0) {
      alertValues.push({ storeId: p.storeId, productId: p.id, type: "OUT_OF_STOCK", status: "ACTIVE" });
    } else if (p.quantity <= p.lowStockThreshold) {
      alertValues.push({ storeId: p.storeId, productId: p.id, type: "LOW_STOCK", status: "ACTIVE" });
    }
    if (p.expiryDate) {
      const expiry = new Date(p.expiryDate);
      const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
        alertValues.push({ storeId: p.storeId, productId: p.id, type: "EXPIRING", status: "ACTIVE" });
      }
    }
  }

  if (alertValues.length > 0) {
    for (let i = 0; i < alertValues.length; i += 50) {
      await db.insert(alerts).values(alertValues.slice(i, i + 50));
    }
  }
  console.log(`  ✓ ${alertValues.length} alerts`);

  console.log("\n🐝 Seed complete!");
}

seed().catch(console.error);
