"use client"

import { useState, type CSSProperties } from "react"
import type { ContributionCalendar, ContributionDay } from "./contributions"
import "./iso-styles.css"

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)

// Isometric grid: each cell's top is a 3.4 x 2 diamond. Weeks step down-right, weekdays step down-left.
const HALF = 1.7
const MAX_HEIGHT = 6
const r = (value: number) => Math.round(value * 100) / 100

function describe(day: ContributionDay) {
  const count = day.count === 0 ? "No contributions" : `${day.count} contribution${day.count === 1 ? "" : "s"}`
  return `${count} · ${dayFormat.format(toDate(day.date))}`
}

function stats(days: ContributionDay[]) {
  let best = 0
  let run = 0
  let highest = 0
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0
    best = Math.max(best, run)
    highest = Math.max(highest, day.count)
  }
  const total = days.reduce((sum, day) => sum + day.count, 0)
  return { best, highest, average: days.length ? total / days.length : 0 }
}

function cellPaths(x: number, y: number, h: number) {
  const top = `M${r(x + HALF)},${r(y + 2)}L${r(x)},${r(y + 1)}L${r(x + HALF)},${r(y)}L${r(x + 2 * HALF)},${r(y + 1)}Z`
  if (h <= 0) return { top }
  const left = `M${r(x)},${r(y + 1)}L${r(x + HALF)},${r(y + 2)}L${r(x + HALF)},${r(y + 2 + h)}L${r(x)},${r(y + 1 + h)}Z`
  const right = `M${r(x + HALF)},${r(y + 2)}L${r(x + 2 * HALF)},${r(y + 1)}L${r(x + 2 * HALF)},${r(y + 1 + h)}L${r(x + HALF)},${r(y + 2 + h)}Z`
  return { top, left, right }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="iso-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export type IsometricContributionsProps = {
  calendar: ContributionCalendar | null
  /** Shown in the empty-state link when calendar is null. */
  username?: string
  className?: string
  /** Mixed into the active building and used as its stroke. */
  accentColor?: string
}

export function IsometricContributions({
  calendar,
  username = "octocat",
  className,
  accentColor = "#0a3986",
}: IsometricContributionsProps) {
  const [active, setActive] = useState<ContributionDay | null>(null)
  const style = { "--iso-accent": accentColor } as CSSProperties

  if (!calendar) {
    return (
      <div className={cx("iso-card", "iso-empty", className)}>
        Activity is unavailable right now.{" "}
        <a href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noreferrer">
          View on GitHub
        </a>
      </div>
    )
  }

  const { weeks } = calendar
  const days = weeks.flat().filter((day): day is ContributionDay => Boolean(day))
  const { best, highest, average } = stats(days)

  let minY = 0
  const cells = weeks.flatMap((week, column) =>
    week.map((day, row) => {
      if (!day) return null
      const h = day.count > 0 && highest > 0 ? Math.max(0.5, (MAX_HEIGHT * day.count) / highest) : 0
      const x = HALF * (column - row)
      const y = column + row - h
      minY = Math.min(minY, y)
      return { day, ...cellPaths(x, y, h) }
    }),
  )

  const pad = 0.6
  const minX = -HALF * 6 - pad
  const width = HALF * (weeks.length - 1) + 2 * HALF + HALF * 6 + 2 * pad
  const height = weeks.length - 1 + 6 + 2 - minY + 2 * pad

  return (
    <div className={cx("iso-card", className)} style={style}>
      <dl className="iso-stats">
        <Stat label="Best streak" value={`${best} day${best === 1 ? "" : "s"}`} />
        <Stat label="Highest in a day" value={String(highest)} />
        <Stat label="Average per day" value={`~${average.toFixed(2)}`} />
      </dl>
      <svg
        viewBox={`${r(minX)} ${r(minY - pad)} ${r(width)} ${r(height)}`}
        className="iso-cal"
        role="img"
        aria-label={`${calendar.total} contributions in the last year`}
        onPointerLeave={() => setActive(null)}
      >
        {cells.map((cell) =>
          cell ? (
            <g
              key={cell.day.date}
              className="iso-cell"
              data-level={cell.day.level}
              data-active={active?.date === cell.day.date ? "" : undefined}
              onPointerEnter={() => setActive(cell.day)}
              onClick={() => setActive(cell.day)}
            >
              {cell.left ? <path className="iso-left" d={cell.left} /> : null}
              {cell.right ? <path className="iso-right" d={cell.right} /> : null}
              <path className="iso-top" d={cell.top} />
            </g>
          ) : null,
        )}
      </svg>
      <div className="iso-caption">
        <div className="iso-legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="gh-tile gh-legend" data-level={level} />
          ))}
          <span>More</span>
        </div>
        <p aria-live="polite">{active ? describe(active) : "Hover a day for details"}</p>
      </div>
    </div>
  )
}

export default IsometricContributions
