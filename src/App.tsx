import { useEffect, useState, type FormEvent } from "react"
import {
  IsometricContributions,
  fetchContributionCalendar,
  parseContributionCalendar,
  type ContributionCalendar,
} from "./index"

const DEFAULT_USER = "RosMengHeang"

function readUsername() {
  const value = new URLSearchParams(window.location.search).get("user")?.trim()
  return value || DEFAULT_USER
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

export function App() {
  const [draft, setDraft] = useState(readUsername)
  const [username, setUsername] = useState(readUsername)
  const [nonce, setNonce] = useState(0)
  const [accent, setAccent] = useState("#0a3986")
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState<ContributionCalendar | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    try {
      localStorage.setItem("iso-theme", dark ? "dark" : "light")
    } catch {
      // Storage can be blocked. The class on <html> still updates this view.
    }
  }, [dark])

  useEffect(() => {
    document.title = `${username} · isometric contributions`
    const url = new URL(window.location.href)
    url.searchParams.set("user", username)
    window.history.replaceState(null, "", url)

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = draft.trim()
    if (!next) return
    setUsername(next)
    setNonce((value) => value + 1)
  }

  return (
    <div className="wrap">
      <header className="top">
        <a className="brand" href="https://github.com/RosMengHeang/isometric-contributions">
          isometric-contributions
        </a>
        <button type="button" className="theme" onClick={() => setDark((value) => !value)}>
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      <h1>A year of commits, as a city.</h1>
      <p className="lede">
        Isometric contribution calendar for React. It reads GitHub&apos;s public graph — the same buildings that run on{" "}
        <a href="https://taxzy.dev">taxzy.dev</a>.
      </p>

      <form onSubmit={onSubmit}>
        <label>
          GitHub username
          <input
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
          <IsometricContributions calendar={calendar} username={username} accentColor={accent} />
        )}
      </div>

      <footer>
        <span>
          By Ros MengHeang · <a href="https://taxzy.dev">taxzy.dev</a>
        </span>
        <a href="https://github.com/RosMengHeang/isometric-contributions/blob/main/LICENSE">MIT</a>
      </footer>
    </div>
  )
}
