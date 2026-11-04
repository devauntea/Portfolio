import type { Metadata } from "next";
import { Space_Grotesk, Syne, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Devauntae Norman | The Working Desk",
  description:
    "Portfolio of Devauntae Norman, an AI and full-stack engineer in New York. Selected work, a few side projects, and a résumé, all laid out on one desk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
