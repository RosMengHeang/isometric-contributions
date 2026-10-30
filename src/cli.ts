#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { parseArgs } from "node:util"
import { fetchContributionCalendar } from "./contributions.ts"
import { variants, type Variant } from "./scene.ts"
import { renderContributionsSvg, type SvgColorScheme } from "./svg.ts"
import { themeNames, type Palette, type ThemeName } from "./themes.ts"

const schemes: readonly SvgColorScheme[] = ["system", "light", "dark"]

const help = `Usage: isometric-contributions <github-username> [options]

Render a GitHub contribution calendar as a standalone SVG (or JSON).

Options
  -v, --variant <name>   ${variants.join(" | ")}   (default: isometric)
  -t, --theme <name>     ${themeNames.join(" | ")}   (default: github)
  -s, --scheme <name>    ${schemes.join(" | ")}   (default: system)
      --colors <list>    five comma-separated colors, overrides --theme
  -f, --format <name>    svg | json   (default: svg)
  -o, --out <file>       write to a file instead of stdout
  -w, --width <px>       SVG width   (default: 880)
      --animate          buildings rise in when the image loads
      --background       fill the card color behind the drawing
      --no-header        hide the total / best-streak line
  -h, --help             show this help

Examples
  npx github:RosMengHeang/isometric-contributions octocat -v city -t ocean -o public/city.svg
  npx github:RosMengHeang/isometric-contributions octocat -f json -o src/data/contributions.json
`

function pick<T extends string>(flag: string, value: string, allowed: readonly T[]): T {
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`Unknown ${flag} "${value}". Use one of: ${allowed.join(", ")}`)
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      variant: { type: "string", short: "v", default: "isometric" },
      theme: { type: "string", short: "t", default: "github" },
      scheme: { type: "string", short: "s", default: "system" },
      colors: { type: "string" },
      format: { type: "string", short: "f", default: "svg" },
      out: { type: "string", short: "o" },
      width: { type: "string", short: "w", default: "880" },
      animate: { type: "boolean", default: false },
      background: { type: "boolean", default: false },
      "no-header": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  })

  const username = positionals[0]?.trim()
  if (values.help || !username) {
    process.stdout.write(help)
    if (!values.help) process.exitCode = 1
    return
  }

  const variant = pick<Variant>("--variant", values.variant, variants)
  const theme = pick<ThemeName>("--theme", values.theme, themeNames)
  const colorScheme = pick<SvgColorScheme>("--scheme", values.scheme, schemes)
  const format = pick("--format", values.format, ["svg", "json"] as const)
  const width = Number(values.width)
  if (!Number.isFinite(width) || width <= 0) throw new Error(`--width must be a positive number, got "${values.width}"`)

  let colors: Palette | undefined
  if (values.colors) {
    const list = values.colors.split(",").map((c) => c.trim()).filter(Boolean)
    if (list.length !== 5) throw new Error(`--colors needs exactly five colors, got ${list.length}`)
    colors = list as unknown as Palette
  }

  const calendar = await fetchContributionCalendar(username, {
    headers: { "user-agent": "isometric-contributions", accept: "text/html" },
  })
  if (!calendar) throw new Error(`Could not load the contribution calendar for "${username}".`)

  const output =
    format === "json"
      ? `${JSON.stringify(calendar, null, 2)}\n`
      : `${renderContributionsSvg(calendar, {
          variant,
          theme,
          colors,
          colorScheme,
          width,
          username,
          header: !values["no-header"],
          background: values.background,
          animate: values.animate,
        })}\n`

  if (values.out) {
    await mkdir(dirname(values.out), { recursive: true })
    await writeFile(values.out, output)
    process.stderr.write(`Wrote ${values.out} (${calendar.total} contributions)\n`)
  } else {
    process.stdout.write(output)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
