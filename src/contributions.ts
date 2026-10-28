export type ContributionDay = {
  date: string
  count: number
  level: number
}

export type ContributionCalendar = {
  total: number
  /** weeks[column][weekday], Sunday first. Null where GitHub has no cell (future days). */
  weeks: (ContributionDay | null)[][]
}

const CELL_ID = /\bid="contribution-day-component-(\d+)-(\d+)"/

// GitHub's public calendar fragment needs no token. Counts live in sibling <tool-tip> elements
// ("No contributions on …" / "3 contributions on …") linked to each cell by id.
export function parseContributionCalendar(html: string): ContributionCalendar | null {
  const counts = new Map<string, number>()
  for (const match of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const count = /^(\d[\d,]*|No) contributions?\b/.exec(match[2].trim())
    if (count) counts.set(match[1], count[1] === "No" ? 0 : Number(count[1].replace(/,/g, "")))
  }

  const columns: (ContributionDay | null)[][] = []
  for (const match of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
    const tag = match[0]
    const date = /\bdata-date="([^"]+)"/.exec(tag)?.[1]
    const cell = CELL_ID.exec(tag)
    if (!date || !cell) continue

    const row = Number(cell[1])
    const column = Number(cell[2])
    columns[column] ??= Array.from({ length: 7 }, () => null)
    columns[column][row] = {
      date,
      count: counts.get(`contribution-day-component-${row}-${column}`) ?? 0,
      level: Math.min(4, Math.max(0, Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? 0))),
    }
  }

  const weeks = columns.filter((week): week is (ContributionDay | null)[] => Boolean(week))
  if (weeks.length === 0) return null

  const total = weeks.flat().reduce((sum, day) => sum + (day?.count ?? 0), 0)
  return { total, weeks }
}

/**
 * Load one GitHub user's public contribution calendar.
 *
 * `username` is the login (for example `RosMengHeang`). The request reads
 * `https://github.com/users/<username>/contributions`, the same HTML fragment
 * GitHub renders on a profile. No personal access token is sent.
 *
 * Call this from a server, a build script, or another runtime that can read
 * GitHub's response. Browsers block it: the page does not send CORS headers.
 * Fetch on the server and pass the calendar into `<IsometricContributions>`.
 */
export async function fetchContributionCalendar(
  username: string,
  init?: RequestInit,
): Promise<ContributionCalendar | null> {
  const login = username.trim()
  if (!login) return null

  try {
    const res = await fetch(`https://github.com/users/${encodeURIComponent(login)}/contributions`, init)
    if (!res.ok) return null
    return parseContributionCalendar(await res.text())
  } catch {
    return null
  }
}
