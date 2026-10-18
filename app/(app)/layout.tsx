import { Suspense } from "react";
import Sidebar from "./components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-light-gray">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* Main content area */}
      <main className="lg:ml-64 pt-16 pb-20 lg:pt-0 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
