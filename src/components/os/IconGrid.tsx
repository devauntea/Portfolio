"use client";

/* Desktop icons you can rearrange. Every icon owns one cell of an
   invisible snap grid, so two icons can never sit on top of each other:
   drop one on an occupied cell and the pair trade places. Positions are
   remembered per machine. */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import {
  useDesktop,
  CELL_W,
  CELL_H,
  GRID_X,
  GRID_Y,
  GRID_BOTTOM,
} from "@/lib/desktop-store";
import { PixelIcon, type PixelIconId } from "./PixelIcons";

/** right-hand strip kept clear so the corner plant never shares a cell */
const RIGHT_RESERVE = 64;

export interface DesktopItem {
  id: string;
  label: string;
  icon: PixelIconId;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** How many whole cells fit between the top-left padding and the taskbar.
    Null until measured, the layout must never be computed against a guess,
    since re-flowing on a wrong size would rewrite the saved arrangement. */
export function useGrid() {
  const [grid, setGrid] = useState<{ cols: number; rows: number } | null>(null);
  useEffect(() => {
    const measure = () =>
      setGrid((prev) => {
        /* a backgrounded tab reports 0×0, measuring then would re-flow the
           whole desktop into a single column */
        if (!window.innerWidth || !window.innerHeight) return prev;
        const next = {
          cols: Math.max(
            1,
            Math.floor((window.innerWidth - GRID_X - RIGHT_RESERVE) / CELL_W),
          ),
          rows: Math.max(
            2,
            Math.floor((window.innerHeight - GRID_Y - GRID_BOTTOM) / CELL_H),
          ),
        };
        return prev && prev.cols === next.cols && prev.rows === next.rows
          ? prev
          : next;
      });
    measure();
    /* settle before re-flowing: a window mid-drag reports dozens of sizes,
       and each one would shuffle the icons */
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(measure, 200);
    };
    window.addEventListener("resize", onResize);
    /* covers the cases `resize` misses, a hidden pane getting its first
       layout, or a container the window never notices changing */
    const ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);
  return grid;
}

function Icon({
  item,
  col,
  row,
  cols,
  rows,
  onOpen,
  onPreview,
  onDrop,
}: {
  item: DesktopItem;
  col: number;
  row: number;
  cols: number;
  rows: number;
  onOpen: () => void;
  onPreview: (cell: { col: number; row: number } | null) => void;
  onDrop: (col: number, row: number) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragging = useRef(false);
  const [held, setHeld] = useState(false);

  const target = useCallback(
    (dx: number, dy: number) => ({
      col: clamp(col + Math.round(dx / CELL_W), 0, cols - 1),
      row: clamp(row + Math.round(dy / CELL_H), 0, rows - 1),
    }),
    [col, row, cols, rows],
  );

  return (
    <motion.button
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => {
        dragging.current = true;
        setHeld(true);
      }}
      onDrag={(_, info) => onPreview(target(info.offset.x, info.offset.y))}
      onDragEnd={(_, info) => {
        const t = target(info.offset.x, info.offset.y);
        x.set(0);
        y.set(0);
        onPreview(null);
        setHeld(false);
        onDrop(t.col, t.row);
        /* framer fires click after a drag, swallow that one */
        setTimeout(() => {
          dragging.current = false;
        }, 0);
      }}
      onClick={() => {
        if (dragging.current) return;
        onOpen();
      }}
      style={{
        x,
        y,
        left: GRID_X + col * CELL_W,
        top: GRID_Y + row * CELL_H,
        width: CELL_W - 4,
        zIndex: held ? 30 : 10,
      }}
      data-cursor="hand"
      /* the boot tour measures these live, icons are draggable and their
         positions persist, so hardcoded coordinates would drift */
      data-tour={`icon-${item.id}`}
      aria-label={`Open ${item.label}`}
      title={item.label}
      className={`group absolute flex touch-none select-none flex-col items-center gap-1 p-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-lumen ${
        held ? "cursor-grabbing opacity-80" : "cursor-grab"
      }`}
    >
      <span
        className={`grid h-12 w-12 place-items-center bg-panel/70 p-0.5 transition-transform bevel-out ${
          held ? "scale-105" : "group-hover:-translate-y-0.5 group-active:translate-y-0"
        }`}
      >
        <PixelIcon id={item.icon} className="h-full w-full" />
      </span>
      <span className="max-w-full truncate bg-cosmos/70 px-1 font-mono text-[10px] leading-tight text-starlight">
        {item.label}
      </span>
    </motion.button>
  );
}

export function IconGrid({
  items,
  onOpen,
}: {
  items: DesktopItem[];
  onOpen: (id: string) => void;
}) {
  const grid = useGrid();
  const slots = useDesktop((s) => s.slots);
  const arrange = useDesktop((s) => s.arrange);
  const moveIcon = useDesktop((s) => s.moveIcon);
  const [ghost, setGhost] = useState<
    { col: number; row: number; id: string } | null
  >(null);

  useEffect(() => {
    if (!grid) return;
    arrange(
      items.map((i) => i.id),
      grid.cols,
      grid.rows,
    );
  }, [items, grid, arrange]);

  /* nothing to draw until the desktop has been measured on the client,
     which also keeps the server markup and the first client pass identical */
  if (!grid) return null;
  const { cols, rows } = grid;

  /* gold outline means "this square is taken, dropping here swaps us" */
  const occupied =
    ghost !== null &&
    Object.entries(slots).some(
      ([id, s]) => id !== ghost.id && s.col === ghost.col && s.row === ghost.row,
    );

  return (
    <div className="absolute inset-0 z-10">
      {ghost && (
        <div
          aria-hidden
          style={{
            left: GRID_X + ghost.col * CELL_W,
            top: GRID_Y + ghost.row * CELL_H,
            width: CELL_W - 4,
            height: CELL_H - 4,
          }}
          className={`pointer-events-none absolute border-2 border-dashed ${
            occupied ? "border-gilt bg-gilt/10" : "border-lumen bg-lumen/10"
          }`}
        />
      )}
      {items.map((item) => {
        const slot = slots[item.id];
        if (!slot) return null;
        return (
          <Icon
            key={item.id}
            item={item}
            col={slot.col}
            row={slot.row}
            cols={cols}
            rows={rows}
            onOpen={() => onOpen(item.id)}
            onPreview={(cell) =>
              setGhost(cell && { ...cell, id: item.id })
            }
            onDrop={(c, r) => moveIcon(item.id, c, r)}
          />
        );
      })}
    </div>
  );
}
