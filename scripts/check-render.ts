import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ContributionCalendar } from "../src/contributions.ts"
import { buildScene, summarizeCalendar, variants } from "../src/scene.ts"
import { renderContributionsSvg } from "../src/svg.ts"
import { resolveColors, shade, themeNames, themes } from "../src/themes.ts"

const day = (date: string, count: number, level: number) => ({ date, count, level })

const calendar: ContributionCalendar = {
  total: 13,
  weeks: [
    [day("2026-01-04", 0, 0), day("2026-01-05", 3, 2), day("2026-01-06", 1, 1), null, null, null, null],
    [day("2026-01-11", 9, 4), day("2026-01-12", 0, 0), null, null, null, null, null],
  ],
}

describe("buildScene", () => {
  for (const variant of variants) {
    it(`draws every day once for ${variant}`, () => {
      const scene = buildScene(calendar, variant)
      const dates = scene.items.flatMap((item) => (item.day ? [item.day.date] : []))
      assert.deepEqual(dates.sort(), ["2026-01-04", "2026-01-05", "2026-01-06", "2026-01-11", "2026-01-12"])
      assert.ok(scene.viewBox.width > 0 && scene.viewBox.height > 0)
      for (const item of scene.items) for (const shape of item.shapes) assert.match(shape.d, /^M[-\d.,MLHVAZa ]+$/)
    })
  }

  it("is deterministic", () => {
    assert.deepEqual(buildScene(calendar, "city"), buildScene(calendar, "city"))
  })

  it("falls back to isometric for an unknown variant", () => {
    assert.equal(buildScene(calendar, "nope" as never).variant, "isometric")
  })

  it("adds tower decoration for skyline", () => {
    const decor = buildScene(calendar, "skyline").items.filter((item) => !item.day)
    assert.equal(decor.length, 1 + calendar.weeks.length)
  })
})

describe("summarizeCalendar", () => {
  it("finds the streak, peak, and average", () => {
    const summary = summarizeCalendar(calendar)
    assert.equal(summary.total, 13)
    assert.equal(summary.best, 3)
    assert.equal(summary.highest, 9)
    assert.equal(summary.average, 13 / 5)
  })
})

describe("themes", () => {
  it("has five light and five dark colors per theme", () => {
    for (const name of themeNames) {
      assert.equal(themes[name].light.length, 5)
      assert.equal(themes[name].dark.length, 5)
    }
  })

  it("lets custom colors override a theme", () => {
    const five = ["#000", "#111", "#222", "#333", "#444"] as const
    assert.deepEqual(resolveColors("ocean", five), { light: five, dark: five })
    assert.deepEqual(resolveColors("ocean", { dark: five }).light, themes.ocean.light)
  })

  it("shades hex colors toward black and falls back to color-mix", () => {
    assert.equal(shade("#ffffff", 0.5), "#808080")
    assert.equal(shade("#fff", 0.2), "#333333")
    assert.equal(shade("rebeccapurple", 0.6), "color-mix(in srgb, rebeccapurple 60%, #000)")
  })
})

describe("renderContributionsSvg", () => {
  it("renders a standalone, scoped SVG", () => {
    const svg = renderContributionsSvg(calendar, { variant: "city", theme: "neon", username: "octo<cat>", id: "x" })
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" id="x" width="880" height="\d+"/)
    assert.match(svg, /@media \(prefers-color-scheme:dark\)/)
    assert.ok(svg.includes(`#x .c4 .iso-top,#x .c4 .iso-tile{fill:${themes.neon.light[4]}}`))
    assert.ok(svg.includes("@octo&lt;cat&gt;"))
    assert.ok(!svg.includes("<cat>"))
    assert.equal((svg.match(/<title>/g) ?? []).length, 1 + 5)
  })

  it("uses one scheme when asked and can animate", () => {
    const svg = renderContributionsSvg(calendar, { colorScheme: "dark", animate: true, header: false, id: "y" })
    assert.ok(!svg.includes("prefers-color-scheme"))
    assert.ok(svg.includes(themes.github.dark[4]))
    assert.ok(svg.includes("@keyframes iso-rise"))
    assert.ok(svg.includes(`style="animation-delay:14ms"`))
  })

  it("renders an empty state for a missing calendar", () => {
    assert.match(renderContributionsSvg(null, { username: "ghost" }), /No contribution data for @ghost/)
  })
})
