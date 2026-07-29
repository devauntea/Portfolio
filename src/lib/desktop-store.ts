"use client";

/* Desktop icon layout. Icons live on a snap grid — one icon per cell, so
   they can never overlap. Positions persist per machine; dropping an icon
   on an occupied cell swaps the two, the way a real desktop would rather
   than refusing the drop. */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** cell footprint in px (icon tile + label + breathing room) */
export const CELL_W = 84;
export const CELL_H = 96;
export const GRID_X = 12;
export const GRID_Y = 12;
/** taskbar height (h-11) plus a little clearance */
export const GRID_BOTTOM = 52;

export interface Slot {
  col: number;
  row: number;
}

const key = (col: number, row: number) => `${col},${row}`;

interface DesktopState {
  slots: Record<string, Slot>;
  /** Give every id a unique in-bounds cell, keeping placements already made. */
  arrange: (ids: string[], cols: number, rows: number) => void;
  /** Drop an icon on a cell; if taken, the two icons trade places. */
  moveIcon: (id: string, col: number, row: number) => void;
  /** Re-flow every icon into reading order, column by column. */
  tidy: (ids: string[], rows: number) => void;
}

export const useDesktop = create<DesktopState>()(
  persist(
    (set) => ({
      slots: {},

      arrange: (ids, cols, rows) =>
        set((s) => {
          const taken = new Set<string>();
          const next: Record<string, Slot> = {};
          const homeless: string[] = [];

          for (const id of ids) {
            const cur = s.slots[id];
            const inBounds =
              cur &&
              cur.col >= 0 &&
              cur.col < cols &&
              cur.row >= 0 &&
              cur.row < rows;
            if (inBounds && !taken.has(key(cur.col, cur.row))) {
              taken.add(key(cur.col, cur.row));
              next[id] = cur;
            } else {
              homeless.push(id);
            }
          }

          /* first free cell, walking down each column then across; columns
             may run past the viewport if there are more icons than cells,
             which still beats stacking two icons on one square */
          let col = 0;
          let row = 0;
          for (const id of homeless) {
            while (taken.has(key(col, row))) {
              row += 1;
              if (row >= rows) {
                row = 0;
                col += 1;
              }
            }
            next[id] = { col, row };
            taken.add(key(col, row));
          }

          const same =
            Object.keys(next).length === Object.keys(s.slots).length &&
            ids.every(
              (id) =>
                s.slots[id] &&
                s.slots[id].col === next[id].col &&
                s.slots[id].row === next[id].row,
            );
          return same ? s : { slots: next };
        }),

      moveIcon: (id, col, row) =>
        set((s) => {
          const from = s.slots[id];
          if (!from || (from.col === col && from.row === row)) return s;
          const occupant = Object.entries(s.slots).find(
            ([other, sl]) => other !== id && sl.col === col && sl.row === row,
          );
          const slots = { ...s.slots, [id]: { col, row } };
          if (occupant) slots[occupant[0]] = from;
          return { slots };
        }),

      tidy: (ids, rows) =>
        set(() => {
          const slots: Record<string, Slot> = {};
          ids.forEach((id, i) => {
            slots[id] = { col: Math.floor(i / rows), row: i % rows };
          });
          return { slots };
        }),
    }),
    { name: "archive-desktop-v1" },
  ),
);
