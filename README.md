# BeeLee Inventory

![License: MIT](https://img.shields.io/badge/license-MIT-green) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-Postgres-c5f74f) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

A demo inventory management app for small sari-sari and grocery stores. It tracks products by category, stock movements, suppliers, low-stock alerts, and basic reports. Built with Next.js and a Neon Postgres database via Drizzle ORM. There is no login; the app is a demo.

## Getting started

Requires Node.js and a Postgres database (the code uses the Neon serverless driver).

```bash
npm install
echo "DATABASE_URL=postgres://user:pass@host/db" > .env.local
npx drizzle-kit push        # create tables from app/lib/schema.ts
npx dotenv -e .env.local -- npx tsx app/lib/seed.ts   # optional sample data (tsx not bundled; install if needed)
npm run dev
```

Open http://localhost:3000.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Structure

- `app/(app)/` - dashboard, inventory, stock movements, alerts, reports pages
- `app/lib/schema.ts` - Drizzle schema (stores, categories, products, stock movements, suppliers, alerts)
- `app/lib/db.ts` - database client
- `app/lib/seed.ts` - sample data seeder
- `public/` - static assets and BeeLee logo

## License

MIT - see [LICENSE](LICENSE).
