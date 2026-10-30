import type { ContributionCalendar } from "./contributions.ts"
import { buildScene, describeDay, noise, summarizeCalendar, type Variant } from "./scene.ts"
import { resolveColors, shade, surfaces, type CustomColors, type Palette, type Surface, type ThemeName } from "./themes.ts"

export type SvgColorScheme = "light" | "dark" | "system"

export type RenderSvgOptions = {
  variant?: Variant
  theme?: ThemeName
  colors?: CustomColors
  /** `system` (default) follows the viewer's OS, which also works inside a GitHub README `<img>`. */
  colorScheme?: SvgColorScheme
  /** Width attribute in pixels. Height follows the drawing. */
  width?: number
  /** Shown in the header line. */
  username?: string
  /** Header line with the total and best streak. Default true. */
  header?: boolean
  /** Fill the card color behind the drawing. Default false (transparent). */
  background?: boolean
  /** Buildings rise in week by week when the image loads. */
  animate?: boolean
  /** id on the root <svg>. Every style rule is scoped to it, so several inline SVGs can share a page. */
  id?: string
}

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)

const r = (value: number) => Math.round(value * 100) / 100

function schemeCss(scope: string, palette: Palette, surface: Surface) {
  const rules = palette.flatMap((color, level) => [
    `${scope} .c${level} .iso-top,${scope} .c${level} .iso-tile{fill:${color}}`,
    `${scope} .c${level} .iso-left{fill:${shade(color, 0.6)}}`,
    `${scope} .c${level} .iso-right{fill:${shade(color, 0.2)}}`,
  ])
  rules.push(
    `${scope} .iso-ground-top,${scope} .iso-base{fill:${palette[0]}}`,
    `${scope} .iso-ground-left{fill:${shade(palette[0], 0.75)}}`,
    `${scope} .iso-ground-right{fill:${shade(palette[0], 0.55)}}`,
    `${scope} .iso-window{fill:${surface.window}}`,
    `${scope} .iso-tree{fill:${surface.tree}}`,
    `${scope} .iso-body{fill:${surface.body}}`,
    `${scope} .iso-bg{fill:${surface.paper}}`,
    `${scope} .iso-ink{fill:${surface.ink}}`,
    `${scope} .iso-muted{fill:${surface.muted}}`,
  )
  return rules.join("")
}

/**
 * Render a calendar to a standalone SVG string. No React, no DOM, no CSS file:
 * write it to disk, serve it from a route, or drop it into any HTML page.
 */
export function renderContributionsSvg(calendar: ContributionCalendar | null, options: RenderSvgOptions = {}): string {
  const {
    variant = "isometric",
    theme = "github",
    colors,
    colorScheme = "system",
    width = 880,
    username,
    header = true,
    background = false,
    animate = false,
  } = options
  const id = options.id ?? `iso-${Math.round(noise(JSON.stringify([variant, theme, colors, colorScheme, username])) * 1e6)}`
  const scope = `#${id}`
  const palette = resolveColors(theme, colors)
  let css =
    colorScheme === "system"
      ? `${schemeCss(scope, palette.light, surfaces.light)}@media (prefers-color-scheme:dark){${schemeCss(scope, palette.dark, surfaces.dark)}}`
      : schemeCss(scope, palette[colorScheme], surfaces[colorScheme])
  css += `${scope} text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}`
  if (animate) {
    css +=
      `${scope} .a{animation:iso-rise .7s cubic-bezier(.22,1,.36,1) backwards}` +
      `@keyframes iso-rise{from{opacity:0;transform:translateY(4px)}}` +
      `@media (prefers-reduced-motion:reduce){${scope} .a{animation:none}}`
  }

  const open = (vb: { x: number; y: number; width: number; height: number }, label: string) => {
    const height = Math.round((width * vb.height) / vb.width)
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" id="${escapeXml(id)}" width="${width}" height="${height}" ` +
      `viewBox="${r(vb.x)} ${r(vb.y)} ${r(vb.width)} ${r(vb.height)}" role="img" aria-label="${escapeXml(label)}">` +
      `<title>${escapeXml(label)}</title><style>${css}</style>` +
      (background ? `<rect class="iso-bg" x="${r(vb.x)}" y="${r(vb.y)}" width="${r(vb.width)}" height="${r(vb.height)}" rx="${r(vb.width * 0.012)}"/>` : "")
    )
  }

  if (!calendar) {
    const label = `No contribution data${username ? ` for @${username}` : ""}`
    return `${open({ x: 0, y: 0, width: 100, height: 8 }, label)}<text class="iso-muted" x="50" y="5" font-size="3" text-anchor="middle">${escapeXml(label)}</text></svg>`
  }

  const scene = buildScene(calendar, variant)
  const { total, best } = summarizeCalendar(calendar)
  const vb = { ...scene.viewBox }
  const label = `${username ? `@${username}: ` : ""}${total.toLocaleString("en-US")} contributions in the last year`

  let head = ""
  if (header) {
    const font = vb.width * 0.018
    const baseline = vb.y - font * 0.8
    vb.y -= font * 2.4
    vb.height += font * 2.4
    const inset = vb.width * 0.01
    head =
      `<text class="iso-ink" x="${r(vb.x + inset)}" y="${r(baseline)}" font-size="${r(font)}">` +
      `${escapeXml(`${username ? `@${username} · ` : ""}${total.toLocaleString("en-US")} contributions in the last year`)}</text>` +
      `<text class="iso-muted" x="${r(vb.x + vb.width - inset)}" y="${r(baseline)}" font-size="${r(font * 0.85)}" text-anchor="end">` +
      `${best}-day best streak</text>`
  }

  const body = scene.items
    .map((item) => {
      const attrs = animate ? ` style="animation-delay:${item.column * 14}ms"` : ""
      const paths = item.shapes.map((shape) => `<path class="iso-${shape.part}" d="${shape.d}"/>`).join("")
      const classes = [item.day ? `c${item.day.level}` : "", animate ? "a" : ""].filter(Boolean).join(" ")
      const tip = item.day ? `<title>${escapeXml(describeDay(item.day))}</title>` : ""
      return `<g${classes ? ` class="${classes}"` : ""}${attrs}>${tip}${paths}</g>`
    })
    .join("")

  return `${open(vb, label)}${head}${body}</svg>`
}
