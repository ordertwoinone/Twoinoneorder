"use client";

import { useId, useState } from "react";
import { POS } from "@/lib/pos/theme";
import { aed, qty, signed } from "@/lib/inventory/types";

/**
 * The stock screens' three pictures, drawn as plain SVG.
 *
 * No chart library: three panels do not justify shipping one to a tablet, and
 * the shapes here are bars — the part a library would do for us is the part
 * that is already easy.
 *
 * Colour does one job only, and it is not identity. Every bar is named on its
 * own axis, so the fill is free to carry direction instead: blue for stock
 * coming in, red for stock going out, slate for the two balances that are
 * neither. Losses take the same red as any other outflow and add a hatch, so
 * "this went out" and "this went out and nobody sold it" stay distinguishable
 * without a fifth hue — which matters both for colour blindness and for the
 * black-and-white printout somebody pins to the store room door.
 *
 * The four fills were run through a contrast and colour-vision check rather
 * than picked by eye. Amber, the obvious choice for consumption and the colour
 * that column wears in the table, failed it hard against the red beside it
 * (ΔE 2.8 under deuteranopia — the same bar twice), which is exactly the sort
 * of thing eyeballing does not catch.
 */

const INFLOW = "#1D4ED8";
const OUTFLOW = "#DC2626";
const NEUTRAL = "#475569";
const VALUE = "#0F766E";

/**
 * A hovered bar's read-out.
 *
 * Held as a percentage of the plot rather than in pixels. Every chart here is
 * an SVG scaled to whatever width its column happens to be, so a coordinate in
 * viewBox units is not where the bar is on screen — the read-out drifted
 * further from its own bar the wider the tablet got.
 */
interface Hover {
  /** 0–100, across the plot. */
  x: number;
  /** 0–100, down the plot. */
  y: number;
  title: string;
  value: string;
  detail?: string;
}

function Tooltip({ hover }: { hover: Hover | null }) {
  if (!hover) return null;
  /* Clamped so a bar at either edge does not push its own read-out off the
     side of the card. */
  const left = Math.min(Math.max(hover.x, 14), 86);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-center shadow-lg"
      style={{ left: `${left}%`, top: `calc(${hover.y}% - 8px)`, background: "#111827" }}
    >
      <p className="whitespace-nowrap text-[11px] font-bold text-white">{hover.title}</p>
      <p className="whitespace-nowrap text-[12.5px] font-black text-white">{hover.value}</p>
      {hover.detail && (
        <p className="whitespace-nowrap text-[10.5px]" style={{ color: "#9CA3AF" }}>{hover.detail}</p>
      )}
    </div>
  );
}

function Panel({
  title,
  hint,
  legend,
  children,
}: {
  title: string;
  hint?: string;
  legend?: { label: string; color: string; hatch?: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${POS.line}` }}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[13px] font-black" style={{ color: POS.ink }}>{title}</h3>
        {hint && <p className="text-[11px]" style={{ color: POS.inkSoft }}>{hint}</p>}
        {legend && (
          <ul className="ms-auto flex flex-wrap items-center gap-3">
            {legend.map((entry) => (
              <li key={entry.label} className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: POS.inkSoft }}>
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{
                    background: entry.color,
                    backgroundImage: entry.hatch
                      ? `repeating-linear-gradient(45deg, rgba(255,255,255,.85) 0 1px, transparent 1px 3px)`
                      : undefined,
                  }}
                />
                {entry.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {children}
    </section>
  );
}

/* ── The day, as a running balance ────────────────────────────────────────── */

export interface FlowStep {
  label: string;
  /** Signed: how this step moves the balance. */
  delta: number;
  /** A total sits on the baseline rather than floating on the running one. */
  total?: boolean;
  /** Stock that left without being sold. Drawn with a hatch over the outflow red. */
  loss?: boolean;
}

/**
 * A waterfall: opening, the four things that happened to it, closing.
 *
 * The count sheet's own formula drawn out, which is the point — somebody
 * looking at a closing balance they did not expect can see which of the four
 * middle bars is the one that surprised them, rather than reading a row of
 * numbers and doing the subtraction in their head.
 */
export function DayFlowChart({ steps }: { steps: FlowStep[] }) {
  const [hover, setHover] = useState<Hover | null>(null);
  const hatchId = useId().replace(/:/g, "");

  const width = 560;
  const height = 190;
  const padTop = 14;
  const padBottom = 44;
  const padLeft = 8;
  const plot = height - padTop - padBottom;

  /* Every bar's top and bottom in data space, walked once so the scale covers
     the running balance as well as the totals — a day that dips below its own
     closing figure still fits. */
  let running = 0;
  const bars = steps.map((step) => {
    const from = step.total ? 0 : running;
    const to = step.total ? step.delta : running + step.delta;
    if (!step.total) running = to;
    else running = step.delta;
    return { step, from, to, low: Math.min(from, to), high: Math.max(from, to) };
  });

  const max = Math.max(...bars.map((b) => b.high), 0);
  const min = Math.min(...bars.map((b) => b.low), 0);
  const span = max - min || 1;

  const y = (value: number) => padTop + plot - ((value - min) / span) * plot;
  const slot = (width - padLeft * 2) / Math.max(bars.length, 1);
  const barWidth = Math.min(slot - 14, 54);

  return (
    <Panel
      title="How the day moved"
      hint="Opening, what happened, closing"
      legend={[
        { label: "In", color: INFLOW },
        { label: "Out", color: OUTFLOW },
        { label: "Lost", color: OUTFLOW, hatch: true },
        { label: "Balance", color: NEUTRAL },
      ]}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img">
          <defs>
            <pattern id={hatchId} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill={OUTFLOW} />
              <line x1="0" y1="0" x2="0" y2="5" stroke="#fff" strokeWidth="1.6" opacity="0.85" />
            </pattern>
          </defs>

          {/* The zero line, recessive — it is a reference, not data. */}
          <line x1={padLeft} y1={y(0)} x2={width - padLeft} y2={y(0)} stroke={POS.line} strokeWidth="1" />

          {bars.map((bar, i) => {
            const x = padLeft + i * slot + (slot - barWidth) / 2;
            const top = Math.min(y(bar.from), y(bar.to));
            const barHeight = Math.max(Math.abs(y(bar.to) - y(bar.from)), 2);
            const fill = bar.step.total
              ? NEUTRAL
              : bar.step.loss
                ? `url(#${hatchId})`
                : bar.step.delta >= 0
                  ? INFLOW
                  : OUTFLOW;

            return (
              <g
                key={bar.step.label}
                onMouseEnter={() =>
                  setHover({
                    x: ((x + barWidth / 2) / width) * 100,
                    y: (top / height) * 100,
                    title: bar.step.label,
                    value: bar.step.total ? `${qty(bar.step.delta)} units` : `${signed(bar.step.delta)} units`,
                    detail: bar.step.total ? undefined : `Running balance ${qty(bar.to)}`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              >
                {/* A hit area taller than the bar: a two-pixel bar for a day
                    with one breakage is otherwise impossible to point at. */}
                <rect x={x - 5} y={padTop} width={barWidth + 10} height={plot} fill="transparent" />
                <rect x={x} y={top} width={barWidth} height={barHeight} rx="3" fill={fill} />
                <text
                  x={x + barWidth / 2}
                  y={top - 5}
                  textAnchor="middle"
                  className="text-[10px] font-black"
                  fill={POS.ink}
                >
                  {bar.step.total ? qty(bar.step.delta) : signed(bar.step.delta)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - padBottom + 15}
                  textAnchor="middle"
                  className="text-[9.5px] font-semibold"
                  fill={POS.inkSoft}
                >
                  {bar.step.label.split(" ")[0]}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - padBottom + 26}
                  textAnchor="middle"
                  className="text-[9.5px] font-semibold"
                  fill={POS.inkSoft}
                >
                  {bar.step.label.split(" ").slice(1).join(" ")}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip hover={hover} />
      </div>
    </Panel>
  );
}

/* ── Where the count disagreed ────────────────────────────────────────────── */

export interface VarianceBar {
  name: string;
  uom: string;
  variance: number;
  value: number;
}

/**
 * Variance by item, around a zero line.
 *
 * Only the lines that disagreed, biggest first. A count where everything
 * matched has nothing to draw, and says so — an empty chart frame with eight
 * flat zeroes in it is worse than a sentence.
 */
export function VarianceChart({ bars }: { bars: VarianceBar[] }) {
  const [hover, setHover] = useState<Hover | null>(null);

  const shown = bars
    .filter((b) => b.variance !== 0)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 8);

  if (shown.length === 0) {
    return (
      <Panel title="Where the count disagreed" hint="Counted less what the books expected">
        <p className="py-12 text-center text-[12.5px]" style={{ color: POS.inkSoft }}>
          Every counted line matches the books.
        </p>
      </Panel>
    );
  }

  const width = 560;
  const rowHeight = 22;
  const height = shown.length * rowHeight + 8;
  const labelWidth = 150;

  /* Room for a figure at BOTH ends of the plot, not just the right one.
     Reserving it on one side only meant the longest shortage — the bar that
     reaches the full half-width, which is by definition the row somebody most
     wants to read — parked its own "−12" on top of the item's name. */
  const valuePad = 44;
  const plotStart = labelWidth + 10 + valuePad;
  const plot = width - plotStart - valuePad;
  const max = Math.max(...shown.map((b) => Math.abs(b.variance)), 1);
  const zero = plotStart + plot / 2;
  const scale = (v: number) => (v / max) * (plot / 2);

  return (
    <Panel
      title="Where the count disagreed"
      hint={`${shown.length} item${shown.length === 1 ? "" : "s"}, largest first`}
      legend={[
        { label: "Short", color: OUTFLOW },
        { label: "Over", color: INFLOW },
      ]}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img">
          <line x1={zero} y1="0" x2={zero} y2={height} stroke={POS.line} strokeWidth="1" />

          {shown.map((bar, i) => {
            const y = i * rowHeight + 4;
            const length = scale(Math.abs(bar.variance));
            const short = bar.variance < 0;
            const x = short ? zero - length : zero;

            return (
              <g
                key={bar.name}
                onMouseEnter={() =>
                  setHover({
                    x: ((short ? zero - length : zero + length) / width) * 100,
                    y: (y / height) * 100,
                    title: bar.name,
                    value: `${signed(bar.variance)} ${bar.uom}`,
                    detail: `${short ? "Short" : "Over"} by ${aed(Math.abs(bar.value))}`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              >
                <rect x="0" y={y - 3} width={width} height={rowHeight} fill="transparent" />
                <text
                  x={labelWidth}
                  y={y + 11}
                  textAnchor="end"
                  className="text-[10.5px] font-semibold"
                  fill={POS.ink}
                >
                  {bar.name.length > 22 ? `${bar.name.slice(0, 21)}…` : bar.name}
                </text>
                <rect
                  x={x}
                  y={y + 2}
                  width={Math.max(length, 2)}
                  height={11}
                  rx="3"
                  fill={short ? OUTFLOW : INFLOW}
                />
                <text
                  x={short ? zero - length - 6 : zero + length + 6}
                  y={y + 11}
                  textAnchor={short ? "end" : "start"}
                  className="text-[10px] font-black"
                  fill={POS.ink}
                >
                  {signed(bar.variance)}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip hover={hover} />
      </div>
    </Panel>
  );
}

/* ── Where the money is sitting ───────────────────────────────────────────── */

export interface CategoryValue {
  category: string;
  value: number;
  units: number;
}

/**
 * Carrying value by category.
 *
 * One flat hue rather than a colour per category: the bar's length already
 * carries the magnitude, and painting eight categories eight colours would be
 * asking a reader to learn a legend to be told something the axis has already
 * said.
 */
export function CategoryValueChart({ rows }: { rows: CategoryValue[] }) {
  const [hover, setHover] = useState<Hover | null>(null);

  const shown = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
  const total = shown.reduce((sum, r) => sum + r.value, 0);

  if (shown.length === 0) {
    return (
      <Panel title="Where the value sits" hint="Carrying value by category">
        <p className="py-12 text-center text-[12.5px]" style={{ color: POS.inkSoft }}>
          Nothing on the shelf is carrying any value yet.
        </p>
      </Panel>
    );
  }

  const width = 560;
  const rowHeight = 26;
  const height = shown.length * rowHeight + 6;
  const labelWidth = 132;
  /* 118 rather than 96: "AED 12,345.00" at the end of a full-width bar ran off
     the panel, and the widest bar is always the one with the longest number. */
  const plot = width - labelWidth - 118;
  const max = Math.max(...shown.map((r) => r.value), 1);

  return (
    <Panel title="Where the value sits" hint={`${aed(total)} across ${shown.length} categories`}>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img">
          {shown.map((row, i) => {
            const y = i * rowHeight + 3;
            const length = Math.max((row.value / max) * plot, 2);
            return (
              <g
                key={row.category}
                onMouseEnter={() =>
                  setHover({
                    x: ((labelWidth + 8 + length) / width) * 100,
                    y: (y / height) * 100,
                    title: row.category,
                    value: aed(row.value),
                    detail: `${qty(row.units)} units · ${((row.value / total) * 100).toFixed(0)}% of stock value`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              >
                <rect x="0" y={y - 2} width={width} height={rowHeight} fill="transparent" />
                <text
                  x={labelWidth}
                  y={y + 14}
                  textAnchor="end"
                  className="text-[10.5px] font-semibold"
                  fill={POS.ink}
                >
                  {row.category.length > 18 ? `${row.category.slice(0, 17)}…` : row.category}
                </text>
                <rect x={labelWidth + 8} y={y + 4} width={length} height={12} rx="3" fill={VALUE} />
                <text
                  x={labelWidth + 16 + length}
                  y={y + 14}
                  className="text-[10px] font-black"
                  fill={POS.ink}
                >
                  {aed(row.value)}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip hover={hover} />
      </div>
    </Panel>
  );
}
