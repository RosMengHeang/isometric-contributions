import assert from "node:assert/strict"
import { afterEach, describe, it } from "node:test"
import { fetchContributionCalendar, parseContributionCalendar } from "../src/contributions.ts"

const html = `
<tool-tip for="contribution-day-component-0-0" class="sr-only">No contributions on January 4th.</tool-tip>
<tool-tip id="tip-b" for="contribution-day-component-1-0" popover="manual">1 contribution on January 5th.</tool-tip>
<tool-tip for="contribution-day-component-0-1">1,204 contributions on January 11th.</tool-tip>
<table>
  <tr>
    <td tabindex="0" data-date="2026-01-04" id="contribution-day-component-0-0" data-level="0" class="ContributionCalendar-day"></td>
    <td tabindex="0" data-date="2026-01-11" id="contribution-day-component-0-1" data-level="8" class="ContributionCalendar-day"></td>
  </tr>
  <tr>
    <td tabindex="0" data-date="2026-01-05" id="contribution-day-component-1-0" data-level="1" class="ContributionCalendar-day"></td>
  </tr>
</table>
`

describe("parseContributionCalendar", () => {
  it("joins tooltips to cells and clamps levels", () => {
    const calendar = parseContributionCalendar(html)
    assert.ok(calendar)
    assert.equal(calendar.total, 1205)
    assert.equal(calendar.weeks.length, 2)
    assert.deepEqual(calendar.weeks[0][0], { date: "2026-01-04", count: 0, level: 0 })
    assert.deepEqual(calendar.weeks[0][1], { date: "2026-01-05", count: 1, level: 1 })
    assert.equal(calendar.weeks[0][2], null)
    assert.deepEqual(calendar.weeks[1][0], { date: "2026-01-11", count: 1204, level: 4 })
  })

  it("returns null when the page has no calendar cells", () => {
    assert.equal(parseContributionCalendar("<html>nothing</html>"), null)
  })
})

describe("fetchContributionCalendar", () => {
  const original = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = original
  })

  it("requests that username and parses the body", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      assert.equal(String(input), "https://github.com/users/RosMengHeang/contributions")
      return new Response(html, { status: 200 })
    }) as typeof fetch

    const calendar = await fetchContributionCalendar("  RosMengHeang  ")
    assert.equal(calendar?.total, 1205)
  })

  it("returns null for an empty username, a failed response, or a network error", async () => {
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      if (calls === 1) return new Response("nope", { status: 404 })
      throw new Error("offline")
    }) as typeof fetch

    assert.equal(await fetchContributionCalendar("   "), null)
    assert.equal(calls, 0)
    assert.equal(await fetchContributionCalendar("octocat"), null)
    assert.equal(await fetchContributionCalendar("octocat"), null)
    assert.equal(calls, 2)
  })
})
