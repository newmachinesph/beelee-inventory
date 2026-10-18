import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "BeeLee Inventory",
    template: "%s | BeeLee Inventory",
  },
  description: "Inventory Management System for sari-sari stores. Track products, manage stock, get alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PH" className="light">
      <body className={`${nunito.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
