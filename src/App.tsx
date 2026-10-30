import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  IsometricContributions,
  fetchContributionCalendar,
  parseContributionCalendar,
  renderContributionsSvg,
  themeNames,
  variants,
  type ContributionCalendar,
  type ThemeName,
  type Variant,
} from "./index.ts"

const DEFAULT_USER = "RosMengHeang"
const DEFAULT_ACCENT = "#0a3986"
const REPO = "RosMengHeang/isometric-contributions"

const VARIANT_LABELS: Record<Variant, string> = {
  isometric: "3D blocks",
  city: "3D city",
  flat: "2D grid",
  skyline: "2D skyline",
}

type Tab = "react" | "svg" | "readme"

const TAB_LABELS: Record<Tab, string> = {
  react: "React / Next.js",
  svg: "Any site (SVG)",
  readme: "GitHub profile",
}

function readParams() {
  const params = new URLSearchParams(window.location.search)
  const variant = params.get("variant") as Variant | null
  const theme = params.get("theme") as ThemeName | null
  return {
    username: params.get("user")?.trim() || DEFAULT_USER,
    variant: variant && variants.includes(variant) ? variant : "city",
    theme: theme && themeNames.includes(theme) ? theme : "github",
  }
}

async function loadCalendar(username: string): Promise<ContributionCalendar | null> {
  const signal = AbortSignal.timeout(15000)
  try {
    const res = await fetch(`/api/github/${encodeURIComponent(username)}/contributions`, { signal })
    if (res.ok) {
      const parsed = parseContributionCalendar(await res.text())
      if (parsed) return parsed
    }
  } catch {
    // Dev and preview proxy the HTML. Anywhere else, use the library fetch.
  }
  return fetchContributionCalendar(username, { signal })
}

function snippet(tab: Tab, username: string, variant: Variant, theme: ThemeName, accent: string, animate: boolean) {
  const flags = [
    variant !== "isometric" && `--variant ${variant}`,
    theme !== "github" && `--theme ${theme}`,
    animate && "--animate",
  ].filter(Boolean)

  if (tab === "react") {
    const props = [
      "calendar={calendar}",
      `username="${username}"`,
      variant !== "isometric" && `variant="${variant}"`,
      theme !== "github" && `theme="${theme}"`,
      accent !== DEFAULT_ACCENT && `accentColor="${accent}"`,
      animate && "animate",
    ].filter(Boolean)
    return `npm install github:${REPO}

// app/github-city.tsx: a Server Component
import { IsometricContributions } from "isometric-contributions"
import { fetchContributionCalendar } from "isometric-contributions/contributions"

export async function GitHubCity() {
  const calendar = await fetchContributionCalendar("${username}", { next: { revalidate: 3600 } })
  return (
    <IsometricContributions
      ${props.join("\n      ")}
    />
  )
}`
  }

  if (tab === "svg") {
    return `npx github:${REPO} ${username} ${[...flags, "-o public/github-city.svg"].join(" ")}

<!-- Plain HTML, Astro, Vue, Svelte, Hugo, Jekyll... -->
<img src="/github-city.svg" alt="${username}'s GitHub contributions" />`
  }

  const inputs = [
    `username: ${username}`,
    variant !== "isometric" && `variant: ${variant}`,
    theme !== "github" && `theme: ${theme}`,
    animate && `animate: "true"`,
    "output: dist/github-city.svg",
  ].filter(Boolean)
  return `# .github/workflows/github-city.yml in your <username>/<username> repo
name: GitHub city
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
          ${inputs.join("\n          ")}
      - uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

<!-- README.md -->
<img src="https://raw.githubusercontent.com/${username}/${username}/output/github-city.svg" alt="My GitHub city" />`
}

export function App() {
  const [initial] = useState(readParams)
  const [draft, setDraft] = useState(initial.username)
  const [username, setUsername] = useState(initial.username)
  const [variant, setVariant] = useState<Variant>(initial.variant)
  const [theme, setTheme] = useState<ThemeName>(initial.theme)
  const [animate, setAnimate] = useState(true)
  const [nonce, setNonce] = useState(0)
  const [accent, setAccent] = useState(DEFAULT_ACCENT)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState<ContributionCalendar | null>(null)
  const [tab, setTab] = useState<Tab>("react")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    try {
      localStorage.setItem("iso-theme", dark ? "dark" : "light")
    } catch {
      // Storage can be blocked. The class on <html> still updates this view.
    }
  }, [dark])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set("user", username)
    url.searchParams.set("variant", variant)
    url.searchParams.set("theme", theme)
    window.history.replaceState(null, "", url)
  }, [username, variant, theme])

  useEffect(() => {
    document.title = `${username} · isometric contributions`
    let cancelled = false
    setLoading(true)
    loadCalendar(username).then((value) => {
      if (cancelled) return
      setCalendar(value)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [username, nonce])

  const code = useMemo(
    () => snippet(tab, username, variant, theme, accent, animate),
    [tab, username, variant, theme, accent, animate],
  )

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = draft.trim()
    if (!next) return
    setUsername(next)
    setNonce((value) => value + 1)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard needs a secure context. The snippet stays selectable.
    }
  }

  function download() {
    const svg = renderContributionsSvg(calendar, { variant, theme, username, animate, colorScheme: dark ? "dark" : "light" })
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${username}-${variant}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="wrap">
      <header className="top">
        <a className="brand" href={`https://github.com/${REPO}`}>
          isometric-contributions
        </a>
        <button type="button" className="theme" onClick={() => setDark((value) => !value)}>
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      <h1>A year of commits, as a city.</h1>
      <p className="lede">
        GitHub contribution calendar as a 3D city, a 2D skyline, or a classic grid. Use it as a React component, a
        static SVG for any site, or a GitHub Action for your profile README. The same buildings run on{" "}
        <a href="https://taxzy.dev">taxzy.dev</a>.
      </p>

      <form onSubmit={onSubmit}>
        <label>
          GitHub username
          <input
            type="text"
            name="username"
            value={draft}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <label>
          Accent
          <input
            type="color"
            value={accent}
            aria-label="Accent color"
            onChange={(event) => setAccent(event.target.value)}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Loading" : "Show"}
        </button>
      </form>

      <div className="controls">
        <div className="segmented" role="radiogroup" aria-label="Style">
          {variants.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={variant === value}
              onClick={() => setVariant(value)}
            >
              {VARIANT_LABELS[value]}
            </button>
          ))}
        </div>
        <label className="inline">
          Theme
          <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeName)}>
            {themeNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline check">
          <input type="checkbox" checked={animate} onChange={(event) => setAnimate(event.target.checked)} />
          Animate
        </label>
      </div>

      <p className="meta">
        {loading ? (
          <span>Fetching {username}</span>
        ) : calendar ? (
          <span>{calendar.total.toLocaleString("en-US")} contributions in the last year</span>
        ) : (
          <span>No contribution graph for {username}</span>
        )}
        <a href={`https://github.com/${encodeURIComponent(username)}`}>github.com/{username}</a>
      </p>

      <div className="stage">
        {loading ? (
          <div className="loading">Drawing the year</div>
        ) : (
          <IsometricContributions
            key={`${variant}-${nonce}`}
            calendar={calendar}
            username={username}
            accentColor={accent}
            variant={variant}
            theme={theme}
            animate={animate}
          />
        )}
      </div>

      <section className="use">
        <div className="use-head">
          <h2>Put it in your portfolio</h2>
          <button type="button" className="ghost" onClick={download} disabled={!calendar}>
            Download SVG
          </button>
        </div>
        <div className="tabs" role="tablist">
          {(Object.keys(TAB_LABELS) as Tab[]).map((value) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>
              {TAB_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="code">
          <button type="button" className="copy" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </section>

      <footer>
        <span>
          By Ros MengHeang · <a href="https://taxzy.dev">taxzy.dev</a>
        </span>
        <a href={`https://github.com/${REPO}/blob/main/LICENSE`}>MIT</a>
      </footer>
    </div>
  )
}
