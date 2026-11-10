import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import type { ContributionCalendar } from "../src/contributions.ts"
import { renderContributionsSvg } from "../src/svg.ts"
import { resolveColors, themes, type Palette } from "../src/themes.ts"

const day = (date: string, count: number, level: number) => ({ date, count, level })

function calendar(date: string, count: number, level: number): ContributionCalendar {
  return {
    total: count,
    weeks: [[day(date, count, level), null, null, null, null, null, null]],
  }
}

const idOf = (svg: string) => svg.match(/\bid="([^"]*)"/)?.[1]

describe("standalone SVG document", () => {
  it("gives an empty id a generated one and keeps different week shapes apart", () => {
    const painted = renderContributionsSvg(calendar("2026-01-04", 3, 2), { id: "", header: false, colorScheme: "light" })
    assert.match(idOf(painted) ?? "", /^iso-/)
    assert.equal(painted.includes("# ."), false)

    const day = (date: string, count: number, level: number) => ({ date, count, level })
    const sideBySide: ContributionCalendar = {
      total: 2,
      weeks: [[day("2026-01-04", 1, 1)], [day("2026-01-05", 1, 1)]],
    }
    const stacked: ContributionCalendar = {
      total: 2,
      weeks: [[day("2026-01-04", 1, 1), day("2026-01-05", 1, 1)]],
    }
    const options = { header: false, colorScheme: "light" as const }
    assert.notEqual(idOf(renderContributionsSvg(sideBySide, options)), idOf(renderContributionsSvg(stacked, options)))
    assert.notEqual(idOf(renderContributionsSvg(null, options)), idOf(renderContributionsSvg({ total: 0, weeks: [] }, options)))
  })

  it("ignores a bad width and an unknown color scheme", () => {
    const svg = renderContributionsSvg(calendar("2026-01-04", 3, 2), {
      id: "wide",
      header: false,
      width: Number.NaN,
      colorScheme: "auto" as "system",
    })
    assert.match(svg, /width="880"/)
    assert.match(svg, /prefers-color-scheme:dark/)
    assert.equal(svg.includes("NaN"), false)
  })

  it("gives different calendars different default ids and repeats the same one", () => {
    const options = { username: "octocat", header: false, colorScheme: "light" as const }
    const first = renderContributionsSvg(calendar("2026-01-04", 1, 1), options)
    const second = renderContributionsSvg(calendar("2026-06-01", 9, 4), options)
    assert.notEqual(idOf(first), idOf(second))
    assert.equal(idOf(first), idOf(renderContributionsSvg(calendar("2026-01-04", 1, 1), options)))
  })

  it("paints an id that starts with a digit and keeps markup out of the style block", () => {
    const digit = renderContributionsSvg(calendar("2026-01-04", 3, 2), {
      id: "1a",
      header: false,
      colorScheme: "light",
    })
    const digitStyle = digit.slice(digit.indexOf("<style>") + 7, digit.indexOf("</style>"))
    assert.match(digitStyle, /#\\31 a /)
    assert.equal(digitStyle.includes("\\1a"), false)
    assert.ok(digitStyle.includes(themes.github.light[2]))

    const year = renderContributionsSvg(calendar("2026-01-04", 3, 2), {
      id: "2026",
      header: false,
      colorScheme: "light",
    })
    const yearStyle = year.slice(year.indexOf("<style>") + 7, year.indexOf("</style>"))
    assert.match(yearStyle, /#\\32 026 /)

    const marked = renderContributionsSvg(calendar("2026-01-04", 3, 2), {
      id: "a<b&c",
      header: false,
      colorScheme: "light",
    })
    const markedStyle = marked.slice(marked.indexOf("<style>") + 7, marked.indexOf("</style>"))
    assert.equal(markedStyle.includes("<"), false)
    assert.equal(markedStyle.includes("&"), false)
    assert.match(marked, /id="a&lt;b&amp;c"/)
  })

  it("does not reuse an id when two ordinary calendars share a 32-bit hash", () => {
    const quiet = {
      total: 0,
      weeks: [[{ date: "2029-01-29", count: 0, level: 0 }, null, null, null, null, null, null]],
    }
    const busy = {
      total: 17,
      weeks: [[{ date: "2045-06-21", count: 17, level: 2 }, null, null, null, null, null, null]],
    }
    const first = renderContributionsSvg(quiet, {
      variant: "isometric",
      theme: "neon",
      colorScheme: "dark",
      username: "u20",
      header: false,
    })
    const second = renderContributionsSvg(busy, {
      variant: "village",
      theme: "halloween",
      colorScheme: "dark",
      username: "u7",
      header: false,
    })
    assert.notEqual(idOf(first), idOf(second))
  })

  it("keeps distinct ids for two day strings that share a short hash", () => {
    const options = { username: "octocat", header: false, colorScheme: "light" as const }
    const first = renderContributionsSvg(calendar("2026-09-21", 34, 4), options)
    const second = renderContributionsSvg(calendar("2026-12-22", 38, 1), options)
    assert.notEqual(idOf(first), idOf(second))
  })

  it("keeps a caller id that is not a css identifier and still paints that cell", () => {
    const svg = renderContributionsSvg(calendar("2026-01-04", 3, 2), {
      id: "a b",
      header: false,
      colorScheme: "light",
    })
    assert.equal(idOf(svg), "a b")
    assert.equal(svg.includes("#a b"), false)
    assert.ok(svg.includes(themes.github.light[2]))
  })

  it("drops a color that leaves a parenthesis open", () => {
    const svg = renderContributionsSvg(calendar("2026-01-04", 3, 2), {
      id: "paren",
      header: false,
      colorScheme: "light",
      colors: ["#111111", "rgb(", "#333333", "#444444", "#555555"],
    })
    const style = svg.slice(svg.indexOf("<style>") + 7, svg.indexOf("</style>"))
    assert.equal(style.includes("rgb("), false)
    assert.ok(style.includes("#333333"))
    assert.ok((style.match(/\{/g) ?? []).length > 20)
  })

  it("does not let a color value close the style element", () => {
    const svg = renderContributionsSvg(calendar("2026-01-04", 3, 1), {
      id: "safe",
      header: false,
      colorScheme: "light",
      colors: ["#010101", '</style><rect id="pwn"/>', "#030303", "#040404", "#050505"],
    })
    assert.equal((svg.match(/<\/style>/g) ?? []).length, 1)
    assert.equal(svg.includes("pwn"), false)
    assert.ok(svg.includes(themes.github.light[1]))
    assert.ok(svg.includes("#010101"))
    assert.ok(svg.includes("#050505"))
  })

  it("paints an out-of-range level with the nearest palette stop", () => {
    const svg = renderContributionsSvg(calendar("2026-01-04", 5, 8), {
      id: "lvl",
      header: false,
      colorScheme: "light",
    })
    assert.match(svg, /class="c4"/)
    assert.equal(svg.includes('class="c8"'), false)
    assert.ok(svg.includes(`#lvl .c4 .iso-top,#lvl .c4 .iso-tile{fill:${themes.github.light[4]}}`))
  })

  it("says contribution when the year total is one", () => {
    const svg = renderContributionsSvg(calendar("2026-01-04", 1, 1), { username: "octo", id: "one" })
    assert.match(svg, /1 contribution in the last year/)
    assert.equal(svg.includes("1 contributions"), false)
  })
})

describe("cli count", () => {
  it("prints one contribution in the singular", () => {
    const dir = mkdtempSync(join(tmpdir(), "iso-cli-"))
    const preload = join(dir, "preload.mjs")
    const out = join(dir, "out.svg")
    writeFileSync(
      preload,
      `globalThis.fetch = async () => new Response(${JSON.stringify(`<tool-tip for="contribution-day-component-0-0">1 contribution on January 4th.</tool-tip><td data-date="2026-01-04" id="contribution-day-component-0-0" data-level="1" class="ContributionCalendar-day"></td>`)}, { status: 200 })\n`,
    )
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--import", preload, "src/cli.ts", "octocat", "--no-header", "-o", out],
      { cwd: new URL("..", import.meta.url), encoding: "utf8" },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stderr, /\(1 contribution\)/)
    assert.equal(result.stderr.includes("1 contributions"), false)
    rmSync(dir, { recursive: true, force: true })
  })
})

describe("resolveColors", () => {
  it("keeps the theme when a custom ramp does not have five colors", () => {
    const short = ["#111"] as unknown as Palette
    assert.deepEqual(resolveColors("ocean", short), { light: themes.ocean.light, dark: themes.ocean.dark })
    assert.deepEqual(resolveColors("ocean", { light: short }).light, themes.ocean.light)
    assert.deepEqual(resolveColors("ocean", { dark: short }).dark, themes.ocean.dark)
    assert.deepEqual(resolveColors("ocean", { light: "black" as unknown as Palette }).light, themes.ocean.light)
  })
})
