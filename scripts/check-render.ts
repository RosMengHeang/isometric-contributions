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
    assert.deepEqual(buildScene(calendar, "village"), buildScene(calendar, "village"))
  })

  it("keeps isometric as the default", () => {
    assert.equal(buildScene(calendar).variant, "isometric")
    assert.equal(variants.includes("village"), true)
    assert.equal(buildScene(calendar, "nope" as never).variant, "isometric")
  })

  it("builds cottages on a grass island", () => {
    const scene = buildScene(calendar, "village")
    const parts = (date: string) => scene.items.find((item) => item.day?.date === date)?.shapes.map((shape) => shape.part) ?? []
    assert.equal(scene.variant, "village")
    for (const date of ["2026-01-04", "2026-01-05", "2026-01-11"]) {
      assert.ok(parts(date).includes("lawn"))
      assert.ok(parts(date).includes("earth"))
    }
    assert.equal(parts("2026-01-04").includes("window"), false)
    assert.equal(parts("2026-01-04").includes("top"), false)
    assert.ok(parts("2026-01-06").includes("window") && parts("2026-01-06").includes("door") && parts("2026-01-06").includes("top"))
    assert.ok(parts("2026-01-11").includes("wall") && parts("2026-01-11").includes("top"))

    const roofSpan = (date: string) => {
      const tops = scene.items.find((item) => item.day?.date === date)?.shapes.filter((shape) => shape.part === "top") ?? []
      const ys = tops.flatMap((shape) => [...shape.d.matchAll(/,(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1])))
      return Math.max(...ys) - Math.min(...ys)
    }
    assert.ok(roofSpan("2026-01-11") > roofSpan("2026-01-06"))
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

  it("paints the village island without changing the default drawing", () => {
    const village = renderContributionsSvg(calendar, { variant: "village", colorScheme: "light", header: false, id: "v" })
    assert.match(village, /class="iso-lawn"/)
    assert.match(village, /class="iso-window"/)
    assert.ok(village.includes("#v .iso-lawn{fill:#7dae4e}"))
    assert.ok(village.includes("#v .iso-earth{fill:#8a6246}"))
    assert.ok(village.includes("#v .iso-wall{fill:#f4efe4}"))
    const dark = renderContributionsSvg(calendar, { variant: "village", colorScheme: "dark", header: false, id: "vd" })
    assert.ok(dark.includes("#vd .iso-lawn{fill:#3e7a3c}"))
    const blocks = renderContributionsSvg(calendar, { header: false, colorScheme: "light", id: "d" })
    assert.equal(blocks.includes('class="iso-lawn"'), false)
    assert.equal(blocks.includes('class="iso-door"'), false)
  })
})
