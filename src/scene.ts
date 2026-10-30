import type { ContributionCalendar, ContributionDay } from "./contributions.ts"

/**
 * - `isometric`: 3D blocks, one per day (the original look).
 * - `city`: 3D skyscrapers on street plates, with lit windows, rooftops, and trees on empty days.
 * - `flat`: the classic 2D GitHub grid.
 * - `skyline`: a 2D city. Each week is a tower whose height follows that week's total;
 *   the bottom seven windows are its days.
 */
export type Variant = "isometric" | "city" | "flat" | "skyline"

export const variants: readonly Variant[] = ["isometric", "city", "flat", "skyline"]

export type ShapePart =
  | "top"
  | "left"
  | "right"
  | "ground-top"
  | "ground-left"
  | "ground-right"
  | "window"
  | "tree"
  | "tile"
  | "body"
  | "base"

export type Shape = { part: ShapePart; d: string }

/** `day` is null for decoration that belongs to no single day (skyline towers, the street). */
export type SceneItem = { day: ContributionDay | null; column: number; shapes: Shape[] }

export type ViewBox = { x: number; y: number; width: number; height: number }

export type Scene = { variant: Variant; items: SceneItem[]; viewBox: ViewBox }

export type CalendarSummary = {
  days: ContributionDay[]
  total: number
  best: number
  highest: number
  average: number
}

export function summarizeCalendar(calendar: ContributionCalendar): CalendarSummary {
  const days = calendar.weeks.flat().filter((day): day is ContributionDay => Boolean(day))
  let best = 0
  let run = 0
  let highest = 0
  let total = 0
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0
    best = Math.max(best, run)
    highest = Math.max(highest, day.count)
    total += day.count
  }
  return { days, total, best, highest, average: days.length ? total / days.length : 0 }
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export function describeDay(day: ContributionDay) {
  const count = day.count === 0 ? "No contributions" : `${day.count} contribution${day.count === 1 ? "" : "s"}`
  return `${count} · ${dayFormat.format(new Date(`${day.date}T00:00:00Z`))}`
}

/** Stable 0–1 value per seed, so windows and trees stay put between renders. */
export function noise(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

const r = (value: number) => Math.round(value * 100) / 100

type Point = readonly [number, number]

class Pen {
  minX = Infinity
  minY = Infinity
  maxX = -Infinity
  maxY = -Infinity

  private see(x: number, y: number) {
    this.minX = Math.min(this.minX, x)
    this.minY = Math.min(this.minY, y)
    this.maxX = Math.max(this.maxX, x)
    this.maxY = Math.max(this.maxY, y)
  }

  poly(points: Point[]) {
    for (const [x, y] of points) this.see(x, y)
    return `M${points.map(([x, y]) => `${r(x)},${r(y)}`).join("L")}Z`
  }

  rect(x: number, y: number, w: number, h: number, radius = 0) {
    if (!radius) return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
    this.see(x, y)
    this.see(x + w, y + h)
    const k = r(radius)
    return (
      `M${r(x + radius)},${r(y)}H${r(x + w - radius)}A${k},${k} 0 0 1 ${r(x + w)},${r(y + radius)}` +
      `V${r(y + h - radius)}A${k},${k} 0 0 1 ${r(x + w - radius)},${r(y + h)}` +
      `H${r(x + radius)}A${k},${k} 0 0 1 ${r(x)},${r(y + h - radius)}` +
      `V${r(y + radius)}A${k},${k} 0 0 1 ${r(x + radius)},${r(y)}Z`
    )
  }

  circle(cx: number, cy: number, radius: number) {
    this.see(cx - radius, cy - radius)
    this.see(cx + radius, cy + radius)
    const k = r(radius)
    return `M${r(cx - radius)},${r(cy)}a${k},${k} 0 1,0 ${r(2 * radius)},0a${k},${k} 0 1,0 ${r(-2 * radius)},0Z`
  }

  viewBox(pad: number): ViewBox {
    if (!Number.isFinite(this.minX)) return { x: 0, y: 0, width: 1, height: 1 }
    return {
      x: r(this.minX - pad),
      y: r(this.minY - pad),
      width: r(this.maxX - this.minX + 2 * pad),
      height: r(this.maxY - this.minY + 2 * pad),
    }
  }
}

// Isometric grid: each cell's top is a 3.4 x 2 diamond. Weeks step down-right, weekdays step down-left.
const HALF = 1.7

/** A box standing on the ground at (cx, cy): diamond footprint hw x hh, height h. */
function prism(
  pen: Pen,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  h: number,
  parts: readonly [ShapePart, ShapePart, ShapePart] = ["top", "left", "right"],
): Shape[] {
  const shapes: Shape[] = []
  if (h > 0) {
    shapes.push({ part: parts[1], d: pen.poly([[cx - hw, cy - h], [cx, cy + hh - h], [cx, cy + hh], [cx - hw, cy]]) })
    shapes.push({ part: parts[2], d: pen.poly([[cx, cy + hh - h], [cx + hw, cy - h], [cx + hw, cy], [cx, cy + hh]]) })
  }
  shapes.push({ part: parts[0], d: pen.poly([[cx, cy - hh - h], [cx + hw, cy - h], [cx, cy + hh - h], [cx - hw, cy - h]]) })
  return shapes
}

function eachDay(calendar: ContributionCalendar, visit: (day: ContributionDay, column: number, row: number) => void) {
  calendar.weeks.forEach((week, column) => week.forEach((day, row) => day && visit(day, column, row)))
}

function isometric(calendar: ContributionCalendar, highest: number, pen: Pen) {
  const items: SceneItem[] = []
  eachDay(calendar, (day, column, row) => {
    const h = day.count > 0 && highest > 0 ? Math.max(0.5, (6 * day.count) / highest) : 0
    const cx = HALF * (column - row) + HALF
    const cy = column + row + 1
    items.push({ day, column, shapes: prism(pen, cx, cy, HALF, 1, h) })
  })
  return items
}

const CITY_MAX = 10
const FOOTPRINT = 0.58

/** Two windows per floor on one face, along the base edge from a to b. */
function faceWindows(pen: Pen, seed: string, a: Point, b: Point, h: number) {
  let d = ""
  let floor = 0
  for (let v = 0.45; v + 0.55 <= h - 0.35; v += 1.1, floor++) {
    for (const [t0, t1] of [[0.16, 0.44], [0.56, 0.84]] as const) {
      if (noise(`${seed}:${floor}:${t0}`) < 0.3) continue
      const at = (t: number, up: number): Point => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]) - up]
      d += pen.poly([at(t0, v + 0.55), at(t1, v + 0.55), at(t1, v), at(t0, v)])
    }
  }
  return d
}

function city(calendar: ContributionCalendar, highest: number, pen: Pen) {
  const items: SceneItem[] = []
  const ground = ["ground-top", "ground-left", "ground-right"] as const
  eachDay(calendar, (day, column, row) => {
    const cx = HALF * (column - row) + HALF
    const cy = column + row + 1
    const shapes = prism(pen, cx, cy + 0.3, HALF * 0.92, 0.92, 0.3, ground)

    if (day.count > 0 && highest > 0) {
      // Square root keeps ordinary days visible when one day dwarfs the rest.
      const h = Math.max(1.2, CITY_MAX * Math.sqrt(day.count / highest))
      const hw = HALF * FOOTPRINT
      const hh = FOOTPRINT
      shapes.push(...prism(pen, cx, cy, hw, hh, h))
      const windows =
        faceWindows(pen, `${day.date}:l`, [cx - hw, cy], [cx, cy + hh], h) +
        faceWindows(pen, `${day.date}:r`, [cx, cy + hh], [cx + hw, cy], h)
      if (windows) shapes.push({ part: "window", d: windows })
      if (day.level >= 4 && h >= CITY_MAX * 0.7) {
        shapes.push({ part: "right", d: pen.rect(cx - 0.07, cy - h - 1.8, 0.14, 1.8) })
      } else if (day.level >= 2 && h >= 3) {
        shapes.push(...prism(pen, cx, cy - h, hw * 0.45, hh * 0.45, 0.6))
      }
    } else if (noise(day.date) < 0.3) {
      shapes.push({ part: "tree", d: pen.circle(cx + (noise(`${day.date}:x`) - 0.5) * 0.8, cy - 0.42, 0.42) })
    }

    items.push({ day, column, shapes })
  })
  return items
}

function flat(calendar: ContributionCalendar, pen: Pen) {
  const items: SceneItem[] = []
  eachDay(calendar, (day, column, row) => {
    items.push({ day, column, shapes: [{ part: "tile", d: pen.rect(column * 1.25, row * 1.25, 1, 1, 0.2) }] })
  })
  return items
}

const COLUMN = 1.4
const TOWER = 1.16
const FLOOR = 0.9
const EXTRA_FLOORS = 9

function skyline(calendar: ContributionCalendar, pen: Pen) {
  const totals = calendar.weeks.map((week) => week.reduce((sum, day) => sum + (day?.count ?? 0), 0))
  const busiest = Math.max(0, ...totals)
  const width = calendar.weeks.length * COLUMN - (COLUMN - TOWER)
  const items: SceneItem[] = [{ day: null, column: 0, shapes: [{ part: "base", d: pen.rect(-0.4, 0, width + 0.8, 0.45) }] }]

  calendar.weeks.forEach((week, column) => {
    const x = column * COLUMN
    const extra = busiest > 0 ? Math.round((EXTRA_FLOORS * totals[column]) / busiest) : 0
    const top = (7 + extra) * FLOOR + 0.25
    const tower: Shape[] = [
      { part: "body", d: pen.rect(x, -top, TOWER, top) },
      { part: "base", d: pen.rect(x - 0.08, -top, TOWER + 0.16, 0.22) },
    ]
    if (busiest > 0 && totals[column] >= busiest * 0.85) {
      tower.push({ part: "body", d: pen.rect(x + TOWER / 2 - 0.06, -top - 1.6, 0.12, 1.6) })
    }
    let lit = ""
    for (let floor = 7; floor < 7 + extra; floor++) {
      const y = -(floor + 1) * FLOOR + 0.2
      if (noise(`${column}:${floor}:a`) > 0.35) lit += pen.rect(x + 0.14, y, 0.36, 0.5)
      if (noise(`${column}:${floor}:b`) > 0.35) lit += pen.rect(x + TOWER - 0.5, y, 0.36, 0.5)
    }
    if (lit) tower.push({ part: "window", d: lit })
    items.push({ day: null, column, shapes: tower })

    week.forEach((day, row) => {
      if (!day) return
      // Sunday sits on the top floor of the base, Saturday at street level, like GitHub's grid.
      const y = -(7 - row) * FLOOR + 0.18
      items.push({ day, column, shapes: [{ part: "tile", d: pen.rect(x + (TOWER - 0.7) / 2, y, 0.7, FLOOR - 0.36, 0.08) }] })
    })
  })
  return items
}

const PADDING: Record<Variant, number> = { isometric: 0.6, city: 0.6, flat: 0.3, skyline: 0.4 }

/** Framework-free geometry for one variant. Both the React component and the SVG renderer draw this. */
export function buildScene(calendar: ContributionCalendar, variant: Variant = "isometric"): Scene {
  const pen = new Pen()
  const { highest } = summarizeCalendar(calendar)
  const kind: Variant = variants.includes(variant) ? variant : "isometric"
  const items =
    kind === "city"
      ? city(calendar, highest, pen)
      : kind === "flat"
        ? flat(calendar, pen)
        : kind === "skyline"
          ? skyline(calendar, pen)
          : isometric(calendar, highest, pen)
  return { variant: kind, items, viewBox: pen.viewBox(PADDING[kind]) }
}
