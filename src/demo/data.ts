import {
  parseContributionCalendar,
  themeNames,
  variants,
  type ContributionCalendar,
  type ContributionDay,
  type ThemeName,
  type Variant,
} from "../index.ts"

export const DEFAULT_USER = "RosMengHeang"

const DAY = 86_400_000

export function readParams() {
  const params = new URLSearchParams(window.location.search)
  const variant = params.get("variant") as Variant | null
  const theme = params.get("theme") as ThemeName | null
  return {
    username: params.get("user")?.trim() || DEFAULT_USER,
    variant: variant && variants.includes(variant) ? variant : ("city" as Variant),
    theme: theme && themeNames.includes(theme) ? theme : ("github" as ThemeName),
  }
}

/** Group a flat, dated list of days into Sunday-first week columns. */
export function calendarFromDays(days: ContributionDay[]): ContributionCalendar | null {
  if (days.length === 0) return null
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1))
  const first = Date.parse(`${sorted[0].date}T00:00:00Z`)
  const start = first - new Date(first).getUTCDay() * DAY
  const weeks: (ContributionDay | null)[][] = []
  let total = 0
  for (const day of sorted) {
    const index = Math.round((Date.parse(`${day.date}T00:00:00Z`) - start) / DAY)
    const column = Math.floor(index / 7)
    weeks[column] ??= Array.from({ length: 7 }, () => null)
    weeks[column][index % 7] = { date: day.date, count: day.count, level: Math.min(4, Math.max(0, day.level)) }
    total += day.count
  }
  return { total, weeks: Array.from(weeks, (week) => week ?? Array.from({ length: 7 }, () => null)) }
}

async function fromDevProxy(username: string, signal: AbortSignal) {
  const res = await fetch(`/api/github/${encodeURIComponent(username)}/contributions`, { signal })
  if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return null
  return parseContributionCalendar(await res.text())
}

// Static hosting has no proxy, and github.com sends no CORS headers. This public
// API mirrors the same calendar with CORS enabled, so hosted previews still work.
async function fromPublicApi(username: string, signal: AbortSignal) {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`, {
    signal,
  })
  if (!res.ok) return null
  const data = (await res.json()) as { contributions?: ContributionDay[] }
  return calendarFromDays(data.contributions ?? [])
}

export async function loadCalendar(username: string): Promise<ContributionCalendar | null> {
  const signal = AbortSignal.timeout(15_000)
  for (const source of [fromDevProxy, fromPublicApi]) {
    try {
      const calendar = await source(username, signal)
      if (calendar) return calendar
    } catch {
      // Try the next source.
    }
  }
  return null
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A believable year of activity, shown when a profile cannot be loaded. */
export function sampleCalendar(): ContributionCalendar {
  const rand = seeded(2026)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const start = today - 52 * 7 * DAY - new Date(today).getUTCDay() * DAY
  const days: ContributionDay[] = []
  for (let t = start, i = 0; t <= today; t += DAY, i++) {
    const weekday = new Date(t).getUTCDay()
    const season = 0.55 + 0.45 * Math.sin(i / 23)
    const active = rand() < (weekday === 0 || weekday === 6 ? 0.3 : 0.72) * season + 0.08
    const count = active ? Math.max(1, Math.round(rand() ** 2 * 16 * season + rand() * 3)) : 0
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4
    days.push({ date: new Date(t).toISOString().slice(0, 10), count, level })
  }
  return calendarFromDays(days) as ContributionCalendar
}
