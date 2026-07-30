import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "rt-points-2026",
  description: "Real-time scoring for live events and football competitions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
