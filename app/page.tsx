import Image from "next/image";
import { db } from "./lib/db";
import { stores } from "./lib/schema";

export default async function LoginPage() {
  const allStores = await db.select().from(stores);

  return (
    <main className="min-h-screen bg-soft-teal flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="BeeLee mascot"
              width={80}
              height={92}
              priority
            />
          </div>

          <h1 className="text-3xl font-extrabold mb-1">
            <span className="text-honey-gold">Bee</span>
            <span className="text-beelee-teal">Lee</span>
          </h1>
          <p className="text-earth-brown font-semibold text-lg mb-1">
            Inventory Management
          </p>
          <p className="text-gray-500 text-sm">
            Select your store to get started
          </p>
        </div>

        {/* Store Cards */}
        <div className="space-y-3">
          {allStores.map((store) => (
            <a
              key={store.id}
              href={`/dashboard?store=${store.id}`}
              className="block bg-white rounded-xl p-5 border-l-4 border-beelee-teal shadow-sm hover:shadow-lg transition-shadow duration-200"
            >
              <h2 className="text-lg font-bold text-earth-brown">
                {store.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">Owner:</span> {store.ownerName}
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-semibold">Location:</span>{" "}
                {store.location}
              </p>
            </a>
          ))}

          {allStores.length === 0 && (
            <div className="bg-white rounded-xl p-5 text-center text-gray-400">
              No stores found. Run the seed script to add demo data.
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Demo &mdash; no password required
        </p>
      </div>
    </main>
  );
}
