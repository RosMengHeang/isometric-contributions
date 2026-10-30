import type { ThemeName, Variant } from "../index.ts"

export const REPO = "RosMengHeang/isometric-contributions"
export const REPO_URL = `https://github.com/${REPO}`
export const INSTALL = `npm install github:${REPO}`
export const DEFAULT_ACCENT = "#0a3986"

export type Settings = {
  username: string
  variant: Variant
  theme: ThemeName
  accent: string
  animate: boolean
  showStats: boolean
  showLegend: boolean
}

export type GuideId = "next" | "spa" | "html" | "readme"

export type Step = { title: string; text?: string; file?: string; code: string }

export type Guide = { id: GuideId; label: string; summary: string; steps: Step[] }

function props(s: Settings, indent: string) {
  return [
    "calendar={calendar}",
    `username="${s.username}"`,
    s.variant !== "isometric" && `variant="${s.variant}"`,
    s.theme !== "github" && `theme="${s.theme}"`,
    s.accent.toLowerCase() !== DEFAULT_ACCENT && `accentColor="${s.accent}"`,
    s.animate && "animate",
    !s.showStats && "showStats={false}",
    !s.showLegend && "showLegend={false}",
  ]
    .filter(Boolean)
    .join(`\n${indent}`)
}

function flags(s: Settings) {
  return [s.variant !== "isometric" && `--variant ${s.variant}`, s.theme !== "github" && `--theme ${s.theme}`, s.animate && "--animate"]
    .filter(Boolean)
    .join(" ")
}

export function buildGuides(s: Settings): Guide[] {
  const cli = flags(s)
  return [
    {
      id: "next",
      label: "Next.js",
      summary: "Server Component, refreshed hourly",
      steps: [
        { title: "Install the package", file: "terminal", code: INSTALL },
        {
          title: "Create the component",
          text: "The data is fetched on the server, so no API key and no CORS issues.",
          file: "app/components/github-city.tsx",
          code: `import { IsometricContributions } from "isometric-contributions"
import { fetchContributionCalendar } from "isometric-contributions/contributions"

export async function GitHubCity() {
  const calendar = await fetchContributionCalendar("${s.username}", {
    next: { revalidate: 3600 },
  })

  return (
    <IsometricContributions
      ${props(s, "      ")}
    />
  )
}`,
        },
        {
          title: "Render it on any page",
          file: "app/page.tsx",
          code: `import { GitHubCity } from "./components/github-city"

export default function Page() {
  return <GitHubCity />
}`,
        },
      ],
    },
    {
      id: "spa",
      label: "React SPA",
      summary: "Vite, CRA, or any client-only app",
      steps: [
        { title: "Install the package", file: "terminal", code: INSTALL },
        {
          title: "Save your data at build time",
          text: "Browsers can't read GitHub's calendar directly, so fetch it once before each build.",
          file: "package.json",
          code: `{
  "scripts": {
    "prebuild": "isometric-contributions ${s.username} --format json -o src/data/contributions.json"
  }
}`,
        },
        {
          title: "Import it and render",
          file: "src/GitHubCity.tsx",
          code: `import { IsometricContributions } from "isometric-contributions"
import calendar from "./data/contributions.json"

export function GitHubCity() {
  return (
    <IsometricContributions
      ${props(s, "      ")}
    />
  )
}`,
        },
      ],
    },
    {
      id: "html",
      label: "Any website",
      summary: "Static SVG, no JavaScript",
      steps: [
        {
          title: "Generate the image",
          text: "Or click Download SVG in the playground above.",
          file: "terminal",
          code: `npx github:${REPO} ${s.username}${cli ? ` ${cli}` : ""} -o public/github-city.svg`,
        },
        {
          title: "Drop it into your page",
          text: "Works with plain HTML, Astro, Vue, Svelte, Hugo, Jekyll, WordPress, and more.",
          file: "index.html",
          code: `<img src="/github-city.svg" alt="${s.username}'s GitHub contributions" />`,
        },
      ],
    },
    {
      id: "readme",
      label: "GitHub README",
      summary: "Auto-updates every day",
      steps: [
        {
          title: "Add the workflow to your profile repo",
          text: `Your profile repo is the one named ${s.username}/${s.username}.`,
          file: ".github/workflows/github-city.yml",
          code: `name: GitHub city
on:
  schedule: [{ cron: "0 0 * * *" }]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: ${REPO}@main
        with:
          username: ${s.username}${s.variant !== "isometric" ? `\n          variant: ${s.variant}` : ""}${s.theme !== "github" ? `\n          theme: ${s.theme}` : ""}${s.animate ? `\n          animate: "true"` : ""}
          output: dist/github-city.svg
      - uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`,
        },
        {
          title: "Show it in your README",
          text: "Run the workflow once from the Actions tab, then add:",
          file: "README.md",
          code: `<img src="https://raw.githubusercontent.com/${s.username}/${s.username}/output/github-city.svg" alt="My GitHub city" />`,
        },
      ],
    },
  ]
}
