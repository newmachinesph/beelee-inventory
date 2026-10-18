"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: "\u{1F4CA}", href: "/dashboard" },
  { label: "Inventory", icon: "\u{1F4E6}", href: "/inventory" },
  { label: "Add Product", icon: "\u2795", href: "/inventory/add" },
  { label: "Stock Movements", icon: "\u{1F4CB}", href: "/stock-movements" },
  { label: "Alerts", icon: "\u{1F514}", href: "/alerts" },
  { label: "Reports", icon: "\u{1F4C8}", href: "/reports" },
];

const mobileNavItems = [
  { label: "Dashboard", icon: "\u{1F4CA}", href: "/dashboard" },
  { label: "Inventory", icon: "\u{1F4E6}", href: "/inventory" },
  { label: "Movements", icon: "\u{1F4CB}", href: "/stock-movements" },
  { label: "Alerts", icon: "\u{1F514}", href: "/alerts" },
  { label: "Reports", icon: "\u{1F4C8}", href: "/reports" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storeParam = searchParams.get("store") || "1";
  const [collapsed, setCollapsed] = useState(false);

  function buildHref(path: string) {
    return `${path}?store=${storeParam}`;
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-30 transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {/* Logo area */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="BeeLee"
              width={36}
              height={42}
              className="shrink-0"
            />
            {!collapsed && (
              <div>
                <h1 className="text-xl font-extrabold leading-tight">
                  <span className="text-honey-gold">Bee</span>
                  <span className="text-beelee-teal">Lee</span>
                </h1>
              </div>
            )}
          </div>
          {!collapsed && (
            <p className="text-xs text-gray-500 mt-2 truncate">Store #{storeParam}</p>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto my-2 text-gray-400 hover:text-beelee-teal text-sm px-2 py-1 rounded transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "\u{25B6}" : "\u{25C0}"}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={buildHref(item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-soft-teal text-beelee-teal"
                    : "text-gray-600 hover:bg-gray-50 hover:text-earth-brown"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Switch Store */}
        <div className="p-3 border-t border-gray-100">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-earth-brown transition-colors ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? "Switch Store" : undefined}
          >
            <span className="text-lg shrink-0">{"\u2190"}</span>
            {!collapsed && <span>Switch Store</span>}
          </Link>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="BeeLee" width={28} height={32} />
            <h1 className="text-lg font-extrabold">
              <span className="text-honey-gold">Bee</span>
              <span className="text-beelee-teal">Lee</span>
            </h1>
          </div>
          <span className="text-xs text-gray-500 truncate max-w-[140px]">
            Store #{storeParam}
          </span>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200">
        <div className="flex justify-around items-center py-1">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={buildHref(item.href)}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "text-beelee-teal border-b-2 border-beelee-teal"
                    : "text-gray-400"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
