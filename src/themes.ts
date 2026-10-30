export type Palette = readonly [string, string, string, string, string]

export type ThemeColors = { light: Palette; dark: Palette }

/** One palette for both color schemes, or separate light and dark ramps. */
export type CustomColors = Palette | Partial<ThemeColors>

export const themes = {
  github: {
    light: ["#e5e5e5", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#2b2b2f", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  halloween: {
    light: ["#e5e5e5", "#ffee4a", "#ffc501", "#fe9600", "#03001c"],
    dark: ["#2b2b2f", "#631c03", "#bd561d", "#fa7a18", "#fddf68"],
  },
  ocean: {
    light: ["#e5e5e5", "#bae6fd", "#38bdf8", "#0284c7", "#0c4a6e"],
    dark: ["#2b2b2f", "#0c4a6e", "#0369a1", "#0ea5e9", "#7dd3fc"],
  },
  sunset: {
    light: ["#e5e5e5", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"],
    dark: ["#2b2b2f", "#7c2d12", "#c2410c", "#f97316", "#fdba74"],
  },
  neon: {
    light: ["#e5e5e5", "#f5d0fe", "#e879f9", "#c026d3", "#701a75"],
    dark: ["#1f1b2e", "#4c1d95", "#a21caf", "#e879f9", "#22d3ee"],
  },
  sakura: {
    light: ["#e5e5e5", "#fbcfe8", "#f472b6", "#db2777", "#9d174d"],
    dark: ["#2b2b2f", "#831843", "#be185d", "#ec4899", "#f9a8d4"],
  },
  frost: {
    light: ["#e5e5e5", "#cffafe", "#67e8f9", "#06b6d4", "#155e75"],
    dark: ["#2b2b2f", "#164e63", "#0e7490", "#22d3ee", "#a5f3fc"],
  },
  mono: {
    light: ["#e5e5e5", "#c4c4c4", "#8f8f8f", "#575757", "#1f1f1f"],
    dark: ["#2b2b2f", "#454549", "#77777c", "#b0b0b4", "#f2f2f2"],
  },
} as const satisfies Record<string, ThemeColors>

export type ThemeName = keyof typeof themes

export const themeNames = Object.keys(themes) as ThemeName[]

export type Surface = {
  paper: string
  ink: string
  muted: string
  window: string
  body: string
  tree: string
}

/** Card, text, window, and skyline colors. Mirrors the defaults in iso-styles.css. */
export const surfaces: Record<"light" | "dark", Surface> = {
  light: { paper: "#ffffff", ink: "#171717", muted: "#a3a3a3", window: "#fff7d6", body: "#b4b4bb", tree: "#8cbf88" },
  dark: { paper: "#161616", ink: "#f5f5f5", muted: "#a3a3a3", window: "#fde68a", body: "#3f3f46", tree: "#2f5a3a" },
}

export function resolveColors(theme: ThemeName = "github", colors?: CustomColors): ThemeColors {
  const base: ThemeColors = themes[theme] ?? themes.github
  if (!colors) return base
  if (Array.isArray(colors)) return { light: colors as Palette, dark: colors as Palette }
  const custom = colors as Partial<ThemeColors>
  return { light: custom.light ?? base.light, dark: custom.dark ?? base.dark }
}

function parseHex(color: string): number[] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match) return null
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1]
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

/** `amount` of `color` and the rest black, like `color-mix(in srgb, color amount, #000)`. */
export function shade(color: string, amount: number): string {
  const rgb = parseHex(color)
  if (!rgb) return `color-mix(in srgb, ${color} ${Math.round(amount * 100)}%, #000)`
  return `#${rgb.map((v) => Math.round(v * amount).toString(16).padStart(2, "0")).join("")}`
}
