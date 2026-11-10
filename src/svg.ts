import type { ContributionCalendar } from "./contributions.ts"
import { buildScene, contributionLevel, describeDay, formatYearTotal, summarizeCalendar, type Variant } from "./scene.ts"
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

function cssEscape(value: string): string {
  let out = ""
  let index = 0
  for (let i = 0; i < value.length; ) {
    const code = value.codePointAt(i) ?? 0
    const size = code > 0xffff ? 2 : 1
    if (code === 0) {
      out += "\uFFFD"
    } else {
      const digit = code >= 0x30 && code <= 0x39
      const ident =
        code === 0x2d ||
        code === 0x5f ||
        digit ||
        (code >= 0x41 && code <= 0x5a) ||
        (code >= 0x61 && code <= 0x7a) ||
        code >= 0x80
      const forceHex =
        code <= 0x1f ||
        code === 0x7f ||
        (index === 0 && digit) ||
        (index === 1 && digit && (value.codePointAt(0) ?? 0) === 0x2d) ||
        (index === 0 && code === 0x2d && i + size === value.length)
      out += !ident || forceHex ? `\\${code.toString(16)} ` : String.fromCodePoint(code)
    }
    i += size
    index += 1
  }
  return out
}

function documentId(seed: string): string {
  let a = 0x811c9dc5
  let b = 0x9e3779b9
  let c = 0x85ebca6b
  let d = 0xc2b2ae35
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i)
    a = Math.imul(a ^ code, 16777619)
    b = Math.imul(b ^ code, 2246822519)
    c = Math.imul(c ^ code, 3266489917)
    d = Math.imul(d ^ code, 668265263)
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0")
  return `iso-${hex(a)}${hex(b)}${hex(c)}${hex(d)}`
}

const UNSAFE_COLOR = /[<>{};\\"'`]|url\s*\(|expression\s*\(|@import/i

function parenthesesBalance(value: string): boolean {
  let depth = 0
  for (const ch of value) {
    if (ch === "(") depth += 1
    else if (ch === ")") {
      depth -= 1
      if (depth < 0) return false
    }
  }
  return depth === 0
}

function safeColor(color: string | undefined, fallback: string): string {
  const value = color?.trim() ?? ""
  if (!value || value.length > 80 || UNSAFE_COLOR.test(value) || !parenthesesBalance(value)) return fallback
  if (!/^[#a-zA-Z0-9(),.%/\s+-]+$/.test(value)) return fallback
  return value
}

function scrubPalette(palette: readonly string[], fallback: Palette): Palette {
  return [
    safeColor(palette[0], fallback[0]),
    safeColor(palette[1], fallback[1]),
    safeColor(palette[2], fallback[2]),
    safeColor(palette[3], fallback[3]),
    safeColor(palette[4], fallback[4]),
  ]
}

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
    `${scope} .iso-lawn{fill:${surface.lawn}}`,
    `${scope} .iso-earth{fill:${surface.earth}}`,
    `${scope} .iso-earth-shade{fill:${surface.earthShade}}`,
    `${scope} .iso-wall{fill:${surface.wall}}`,
    `${scope} .iso-wall-shade{fill:${surface.wallShade}}`,
    `${scope} .iso-door{fill:${surface.door}}`,
    `${scope} .iso-flower{fill:${surface.flower}}`,
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
  const scheme: SvgColorScheme =
    colorScheme === "light" || colorScheme === "dark" || colorScheme === "system" ? colorScheme : "system"
  const safeWidth = typeof width === "number" && Number.isFinite(width) && width > 0 ? width : 880
  const id = options.id
    ? options.id
    : documentId(JSON.stringify([variant, theme, colors, scheme, username, calendar]))
  const scope = `#${cssEscape(id)}`
  const themePalette = resolveColors(theme)
  const chosen = resolveColors(theme, colors)
  const palette = {
    light: scrubPalette(chosen.light, themePalette.light),
    dark: scrubPalette(chosen.dark, themePalette.dark),
  }
  let css =
    scheme === "system"
      ? `${schemeCss(scope, palette.light, surfaces.light)}@media (prefers-color-scheme:dark){${schemeCss(scope, palette.dark, surfaces.dark)}}`
      : schemeCss(scope, palette[scheme], surfaces[scheme])
  css += `${scope} text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}`
  if (animate) {
    css +=
      `${scope} .a{animation:iso-rise .7s cubic-bezier(.22,1,.36,1) backwards}` +
      `@keyframes iso-rise{from{opacity:0;transform:translateY(4px)}}` +
      `@media (prefers-reduced-motion:reduce){${scope} .a{animation:none}}`
  }

  const open = (vb: { x: number; y: number; width: number; height: number }, label: string) => {
    const height = Math.round((safeWidth * vb.height) / vb.width)
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" id="${escapeXml(id)}" width="${safeWidth}" height="${height}" ` +
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
  const phrase = formatYearTotal(total)
  const label = `${username ? `@${username}: ` : ""}${phrase}`

  let head = ""
  if (header) {
    const font = vb.width * 0.018
    const baseline = vb.y - font * 0.8
    vb.y -= font * 2.4
    vb.height += font * 2.4
    const inset = vb.width * 0.01
    head =
      `<text class="iso-ink" x="${r(vb.x + inset)}" y="${r(baseline)}" font-size="${r(font)}">` +
      `${escapeXml(`${username ? `@${username} · ` : ""}${phrase}`)}</text>` +
      `<text class="iso-muted" x="${r(vb.x + vb.width - inset)}" y="${r(baseline)}" font-size="${r(font * 0.85)}" text-anchor="end">` +
      `${best}-day best streak</text>`
  }

  const body = scene.items
    .map((item) => {
      const attrs = animate ? ` style="animation-delay:${item.column * 14}ms"` : ""
      const paths = item.shapes.map((shape) => `<path class="iso-${shape.part}" d="${shape.d}"/>`).join("")
      const classes = [item.day ? `c${contributionLevel(item.day.level)}` : "", animate ? "a" : ""].filter(Boolean).join(" ")
      const tip = item.day ? `<title>${escapeXml(describeDay(item.day))}</title>` : ""
      return `<g${classes ? ` class="${classes}"` : ""}${attrs}>${tip}${paths}</g>`
    })
    .join("")

  return `${open(vb, label)}${head}${body}</svg>`
}
