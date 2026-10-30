"use client"

import { useMemo, useState, type CSSProperties } from "react"
import type { ContributionCalendar, ContributionDay } from "./contributions.ts"
import { buildScene, describeDay, summarizeCalendar, type Variant } from "./scene.ts"
import { resolveColors, type CustomColors, type ThemeName } from "./themes.ts"
import "./iso-styles.css"

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

/**
 * - `auto`: dark when an ancestor has the class `dark` (Tailwind's class strategy).
 * - `system`: follows the visitor's OS setting.
 * - `light` / `dark`: fixed.
 */
export type ColorScheme = "auto" | "system" | "light" | "dark"

export type IsometricContributionsProps = {
  calendar: ContributionCalendar | null
  /** Shown in the empty-state link when calendar is null. */
  username?: string
  className?: string
  /** Mixed into the active building and used as its stroke. */
  accentColor?: string
  /** `isometric` (3D blocks), `city` (3D city), `flat` (2D grid), or `skyline` (2D city). */
  variant?: Variant
  /** Built-in color ramp. */
  theme?: ThemeName
  /** Five colors, from no contributions to the most. Overrides `theme`. */
  colors?: CustomColors
  colorScheme?: ColorScheme
  /** Buildings rise in, week by week, on first render. Skipped for reduced motion. */
  animate?: boolean
  /** Best streak, busiest day, and average per day. */
  showStats?: boolean
  /** Legend and the hovered-day line. */
  showLegend?: boolean
}

export function IsometricContributions({
  calendar,
  username = "octocat",
  className,
  accentColor = "#0a3986",
  variant = "isometric",
  theme = "github",
  colors,
  colorScheme = "auto",
  animate = false,
  showStats = true,
  showLegend = true,
}: IsometricContributionsProps) {
  const [active, setActive] = useState<ContributionDay | null>(null)
  const scene = useMemo(() => (calendar ? buildScene(calendar, variant) : null), [calendar, variant])
  const summary = useMemo(() => (calendar ? summarizeCalendar(calendar) : null), [calendar])

  const palette = resolveColors(theme, colors)
  const vars: Record<string, string> = { "--iso-accent": accentColor }
  palette.light.forEach((color, i) => (vars[`--iso-l${i}`] = color))
  palette.dark.forEach((color, i) => (vars[`--iso-d${i}`] = color))
  const style = vars as CSSProperties
  const scheme = colorScheme === "auto" ? undefined : colorScheme

  if (!calendar || !scene || !summary) {
    return (
      <div className={cx("iso-card", "iso-empty", className)} style={style} data-scheme={scheme}>
        Activity is unavailable right now.{" "}
        <a href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noreferrer">
          View on GitHub
        </a>
      </div>
    )
  }

  const { best, highest, average } = summary
  const { viewBox } = scene

  return (
    <div
      className={cx("iso-card", !showStats && !showLegend && "iso-bare", className)}
      style={style}
      data-scheme={scheme}
      data-theme={colors ? "custom" : theme}
    >
      {showStats ? (
        <dl className="iso-stats">
          <Stat label="Best streak" value={`${best} day${best === 1 ? "" : "s"}`} />
          <Stat label="Highest in a day" value={String(highest)} />
          <Stat label="Average per day" value={`~${average.toFixed(2)}`} />
        </dl>
      ) : null}
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="iso-cal"
        role="img"
        aria-label={`${calendar.total} contributions in the last year`}
        data-variant={scene.variant}
        data-animate={animate ? "" : undefined}
        onPointerLeave={() => setActive(null)}
      >
        {scene.items.map((item, index) => {
          const delay = animate ? ({ "--iso-i": item.column } as CSSProperties) : undefined
          const paths = item.shapes.map((shape, i) => <path key={i} className={`iso-${shape.part}`} d={shape.d} />)
          const day = item.day
          if (!day) {
            return (
              <g key={`decor-${index}`} className="iso-decor" style={delay} aria-hidden="true">
                {paths}
              </g>
            )
          }
          return (
            <g
              key={day.date}
              className="iso-cell"
              style={delay}
              data-level={day.level}
              data-active={active?.date === day.date ? "" : undefined}
              onPointerEnter={() => setActive(day)}
              onClick={() => setActive(day)}
            >
              {paths}
            </g>
          )
        })}
      </svg>
      {showLegend ? (
        <div className="iso-caption">
          <div className="iso-legend" aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className="gh-tile gh-legend" data-level={level} />
            ))}
            <span>More</span>
          </div>
          <p aria-live="polite">{active ? describeDay(active) : "Hover a day for details"}</p>
        </div>
      ) : null}
    </div>
  )
}

export default IsometricContributions
