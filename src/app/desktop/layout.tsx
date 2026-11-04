import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DevauntaeOS | The Original Desktop",
  description:
    "The original DevauntaeOS: a retro desktop, gallery, games, and a hidden garden.",
};

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
