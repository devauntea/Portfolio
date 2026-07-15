"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* Shared modal shell. `open` is derived from a selection id in the UI store;
   closing calls onClose. Variant switches between glass (3D world) and a
   retro pixel dialogue box (dungeon). */

export function GameModal({
  open,
  onClose,
  children,
  variant = "glass",
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: "glass" | "pixel";
  label?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-cosmos/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-label={label}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className={cn(
                  "fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 p-6",
                  variant === "glass" ? "glass rounded-2xl" : "pixel-box bg-panel rounded-none",
                )}
              >
                {children}
                <Dialog.Close
                  data-cursor="hand"
                  aria-label="Close"
                  className="absolute right-3 top-3 rounded-md p-1 text-faint transition-colors hover:text-starlight"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
