import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MouseTrail } from "@/components/os/MouseTrail";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevauntaeOS — Devauntae Norman",
  description:
    "A retro desktop that is the portfolio: open the folders, read the résumé, walk the gallery, visit the game room — and find the plant that seems… alive.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <MouseTrail />
      </body>
    </html>
  );
}
