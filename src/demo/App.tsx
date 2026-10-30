import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import {
  IsometricContributions,
  renderContributionsSvg,
  themeNames,
  themes,
  variants,
  type ContributionCalendar,
  type ThemeName,
  type Variant,
} from "../index.ts"
import { CodeBlock, CopyButton, copyText } from "./code.tsx"
import { DEFAULT_USER, loadCalendar, readParams, sampleCalendar } from "./data.ts"
import {
  ArrowIcon,
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  EyeIcon,
  GitHubIcon,
  ImageIcon,
  LayersIcon,
  LinkIcon,
  LockIcon,
  Logo,
  MoonIcon,
  PaletteIcon,
  ReplayIcon,
  SearchIcon,
  ServerIcon,
  StarIcon,
  SunIcon,
  VariantGlyph,
} from "./icons.tsx"
import { buildGuides, DEFAULT_ACCENT, INSTALL, REPO, REPO_URL, type GuideId, type Settings } from "./snippets.ts"

const STYLE_INFO: Record<Variant, { label: string; blurb: string }> = {
  isometric: { label: "3D Blocks", blurb: "One block per day. Height follows the count." },
  city: { label: "3D City", blurb: "Skyscrapers, lit windows, rooftops, and parks." },
  flat: { label: "2D Grid", blurb: "The classic GitHub calendar, restyled." },
  skyline: { label: "2D Skyline", blurb: "One tower per week. Days are the windows." },
}

const QUICK_USERS = ["RosMengHeang", "torvalds", "gaearon", "sindresorhus"]

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <LayersIcon size={18} />, title: "Four styles", text: "3D blocks, a 3D city, a 2D skyline, or the classic grid, all from one prop." },
  { icon: <PaletteIcon size={18} />, title: "Eight themes", text: "Light and dark ramps for every theme, or bring your own five brand colors." },
  { icon: <LockIcon size={18} />, title: "No token needed", text: "Reads GitHub's public calendar. No API key, no OAuth, and no rate-limit headaches." },
  { icon: <ServerIcon size={18} />, title: "Server-first", text: "Fetch on the server, hydrate only the hover. Works with React 18 and 19 and RSC." },
  { icon: <ImageIcon size={18} />, title: "SVG anywhere", text: "A CLI and a GitHub Action write a standalone SVG for any site or profile README." },
  { icon: <EyeIcon size={18} />, title: "Accessible", text: "Labelled SVG, tap to inspect a day on touch screens, and animation that respects reduced motion." },
]

const PROPS: [string, string, string, string][] = [
  ["calendar", "ContributionCalendar | null", "—", "The parsed year. null renders an empty state."],
  ["variant", '"isometric" | "city" | "flat" | "skyline"', '"isometric"', "Drawing style."],
  ["theme", "ThemeName", '"github"', "Built-in color ramp."],
  ["colors", "[5 colors] | { light?, dark? }", "—", "Your own ramp. Overrides theme."],
  ["colorScheme", '"auto" | "system" | "light" | "dark"', '"auto"', "auto follows a .dark class on any ancestor."],
  ["animate", "boolean", "false", "Buildings rise in week by week."],
  ["showStats", "boolean", "true", "Best streak, highest day, and average."],
  ["showLegend", "boolean", "true", "Legend and the hovered-day line."],
  ["accentColor", "string", '"#0a3986"', "Highlight for the hovered day."],
  ["username", "string", '"octocat"', "Used in the empty-state link."],
  ["className", "string", "—", "Extra class on the root element."],
]

type Status = "loading" | "live" | "missing"

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
  try {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = image.width * scale
    canvas.height = image.height * scale
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png"),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="switch">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
    </label>
  )
}

function ControlGroup({ label, children, aside }: { label: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="control-group">
      <div className="control-label">
        <span>{label}</span>
        {aside}
      </div>
      {children}
    </div>
  )
}

export function App() {
  const [initial] = useState(readParams)
  const [draft, setDraft] = useState(initial.username)
  const [username, setUsername] = useState(initial.username)
  const [variant, setVariant] = useState<Variant>(initial.variant)
  const [theme, setTheme] = useState<ThemeName>(initial.theme)
  const [accent, setAccent] = useState(DEFAULT_ACCENT)
  const [animate, setAnimate] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [status, setStatus] = useState<Status>("loading")
  const [calendar, setCalendar] = useState<ContributionCalendar | null>(null)
  const [nonce, setNonce] = useState(0)
  const [replay, setReplay] = useState(0)
  const [guideId, setGuideId] = useState<GuideId>("next")
  const [stars, setStars] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const sample = useMemo(sampleCalendar, [])

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
    let cancelled = false
    setStatus("loading")
    loadCalendar(username).then((value) => {
      if (cancelled) return
      setCalendar(value ?? sample)
      setStatus(value ? "live" : "missing")
    })
    return () => {
      cancelled = true
    }
  }, [username, nonce, sample])

  useEffect(() => {
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        if (typeof data?.stargazers_count === "number") setStars(data.stargazers_count)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const settings: Settings = { username, variant, theme, accent, animate, showStats, showLegend }
  const guides = useMemo(() => buildGuides(settings), [username, variant, theme, accent, animate, showStats, showLegend])
  const guide = guides.find((item) => item.id === guideId) ?? guides[0]

  function load(name: string) {
    const next = name.trim()
    if (!next) return
    setDraft(next)
    setUsername(next)
    setNonce((value) => value + 1)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    load(draft)
  }

  function pickStyle(value: Variant) {
    setVariant(value)
    document.getElementById("playground")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function svgMarkup(background = false) {
    return renderContributionsSvg(calendar, {
      variant,
      theme,
      username,
      animate,
      background,
      colorScheme: dark ? "dark" : "light",
    })
  }

  async function downloadPng() {
    try {
      saveBlob(await svgToPng(svgMarkup(true)), `${username}-${variant}.png`)
    } catch {
      setToast("PNG export is not supported in this browser")
    }
  }

  const total = calendar?.total.toLocaleString("en-US") ?? "—"

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a className="nav-brand" href="#top">
            <Logo />
            <span>isometric-contributions</span>
          </a>
          <nav className="nav-links" aria-label="Sections">
            <a href="#playground">Playground</a>
            <a href="#styles">Styles</a>
            <a href="#get-started">Get started</a>
            <a href="#api">API</a>
          </nav>
          <div className="nav-actions">
            <a className="btn btn-ghost btn-sm" href={REPO_URL} target="_blank" rel="noreferrer">
              <GitHubIcon />
              <span className="hide-sm">Star</span>
              {stars ? <span className="star-count">{stars.toLocaleString("en-US")}</span> : null}
            </a>
            <button
              type="button"
              className="icon-btn"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="container hero-inner">
            <a className="pill" href="#styles">
              <span className="pill-tag">New</span>
              3D city and 2D skyline styles
              <ArrowIcon size={14} />
            </a>
            <h1>
              Your GitHub contributions,
              <br />
              <span className="gradient">built as a city.</span>
            </h1>
            <p className="hero-lede">
              An open-source React component, SVG renderer, CLI, and GitHub Action that turns a year of commits into 3D
              blocks, a skyline, or a classic grid. Add it to any portfolio in minutes.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#playground">
                Try it with your username
                <ArrowIcon size={16} />
              </a>
              <a className="btn btn-secondary" href="#get-started">
                <CodeIcon />
                Read the setup guide
              </a>
            </div>
            <div className="install">
              <span className="install-prompt">$</span>
              <code>{INSTALL}</code>
              <CopyButton text={INSTALL} label="Copy" className="install-copy" />
            </div>
            <ul className="badges" aria-label="Project facts">
              <li>MIT licensed</li>
              <li>TypeScript</li>
              <li>React 18+</li>
              <li>Zero runtime dependencies</li>
            </ul>
          </div>
        </section>

        <section id="playground" className="section section-tight">
          <div className="container">
            <div className="playground">
              <div className="pg-toolbar">
                <form className="pg-search" onSubmit={onSubmit}>
                  <span className="pg-search-icon">
                    <GitHubIcon />
                  </span>
                  <span className="pg-search-prefix">github.com/</span>
                  <input
                    aria-label="GitHub username"
                    placeholder="username"
                    value={draft}
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={status === "loading"}>
                    <SearchIcon size={14} />
                    {status === "loading" ? "Loading" : "Preview"}
                  </button>
                </form>
                <div className="pg-quick">
                  <span>Try:</span>
                  {QUICK_USERS.map((name) => (
                    <button key={name} type="button" className="chip" onClick={() => load(name)} aria-pressed={username === name}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pg-body">
                <div className="pg-main">
                  <div className="pg-meta">
                    <img
                      key={username}
                      className="avatar"
                      src={`https://github.com/${encodeURIComponent(username)}.png?size=80`}
                      alt=""
                      width={36}
                      height={36}
                      onError={(event) => (event.currentTarget.style.visibility = "hidden")}
                    />
                    <div className="pg-meta-text">
                      <a href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noreferrer">
                        @{username}
                      </a>
                      <span>
                        {status === "loading"
                          ? "Loading contributions…"
                          : status === "live"
                            ? `${total} contributions in the last year`
                            : "Profile not found. Showing sample data."}
                      </span>
                    </div>
                    <span className={`status status-${status}`}>
                      <i />
                      {status === "live" ? "Live data" : status === "loading" ? "Loading" : "Sample data"}
                    </span>
                  </div>

                  <div className="pg-stage" data-loading={status === "loading" ? "" : undefined}>
                    {calendar ? (
                      <IsometricContributions
                        key={`${variant}-${replay}-${nonce}`}
                        className="pg-chart"
                        calendar={calendar}
                        username={username}
                        variant={variant}
                        theme={theme}
                        accentColor={accent}
                        animate={animate}
                        showStats={showStats}
                        showLegend={showLegend}
                      />
                    ) : (
                      <div className="skeleton" aria-label="Loading" />
                    )}
                  </div>
                </div>

                <aside className="pg-controls" aria-label="Customize">
                  <ControlGroup label="Style">
                    <div className="style-grid" role="radiogroup" aria-label="Style">
                      {variants.map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={variant === value}
                          className="style-tile"
                          onClick={() => setVariant(value)}
                        >
                          <VariantGlyph variant={value} />
                          <span>{STYLE_INFO[value].label}</span>
                        </button>
                      ))}
                    </div>
                  </ControlGroup>

                  <ControlGroup label="Theme" aside={<span className="control-value">{theme}</span>}>
                    <div className="theme-grid" role="radiogroup" aria-label="Theme">
                      {themeNames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          role="radio"
                          aria-checked={theme === name}
                          aria-label={name}
                          title={name}
                          className="theme-chip"
                          onClick={() => setTheme(name)}
                        >
                          {themes[name][dark ? "dark" : "light"].slice(1).map((color) => (
                            <i key={color} style={{ background: color }} />
                          ))}
                        </button>
                      ))}
                    </div>
                  </ControlGroup>

                  <ControlGroup label="Options">
                    <div className="switches">
                      <Switch label="Rise animation" checked={animate} onChange={setAnimate} />
                      <Switch label="Show stats" checked={showStats} onChange={setShowStats} />
                      <Switch label="Show legend" checked={showLegend} onChange={setShowLegend} />
                      <label className="switch">
                        <span>Hover accent</span>
                        <span className="accent">
                          <code>{accent}</code>
                          <input type="color" value={accent} aria-label="Hover accent color" onChange={(event) => setAccent(event.target.value)} />
                        </span>
                      </label>
                    </div>
                  </ControlGroup>

                  <ControlGroup label="Export">
                    <div className="export-grid">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!calendar}
                        onClick={() => saveBlob(new Blob([svgMarkup()], { type: "image/svg+xml" }), `${username}-${variant}.svg`)}
                      >
                        <DownloadIcon size={14} /> SVG
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={!calendar} onClick={downloadPng}>
                        <DownloadIcon size={14} /> PNG
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!calendar}
                        onClick={async () => setToast((await copyText(svgMarkup())) ? "SVG markup copied" : "Copy failed")}
                      >
                        <CodeIcon size={14} /> Copy SVG
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={async () => setToast((await copyText(window.location.href)) ? "Link copied" : "Copy failed")}
                      >
                        <LinkIcon size={14} /> Share
                      </button>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={() => setReplay((value) => value + 1)}>
                      <ReplayIcon size={14} /> Replay animation
                    </button>
                  </ControlGroup>

                  <a className="btn btn-primary btn-block" href="#get-started">
                    Get the code for this setup
                    <ArrowIcon size={16} />
                  </a>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section id="styles" className="section">
          <div className="container">
            <SectionHead
              eyebrow="Styles"
              title="Four ways to draw a year"
              text="Same data, same component. Switch the variant prop and the whole calendar is rebuilt."
            />
            <div className="gallery">
              {variants.map((value) => (
                <article key={value} className="gallery-card" data-active={variant === value ? "" : undefined}>
                  <div className="gallery-art">
                    {calendar ? (
                      <IsometricContributions
                        className="gallery-chart"
                        calendar={calendar}
                        username={username}
                        variant={value}
                        theme={theme}
                        accentColor={accent}
                        showStats={false}
                        showLegend={false}
                      />
                    ) : (
                      <div className="skeleton skeleton-sm" />
                    )}
                  </div>
                  <div className="gallery-info">
                    <div>
                      <h3>{STYLE_INFO[value].label}</h3>
                      <p>{STYLE_INFO[value].blurb}</p>
                      <code>variant="{value}"</code>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => pickStyle(value)}>
                      {variant === value ? "Selected" : "Use this"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="get-started" className="section section-alt">
          <div className="container">
            <SectionHead
              eyebrow="Get started"
              title="Add it to your portfolio in minutes"
              text="Pick how your site is built. The code below already uses the username, style, and theme from the playground."
            />
            <div className="guide">
              <div className="guide-tabs" role="tablist" aria-label="Setup">
                {guides.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === guide.id}
                    onClick={() => setGuideId(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.summary}</span>
                  </button>
                ))}
              </div>
              <ol className="steps">
                {guide.steps.map((step, index) => (
                  <li key={`${guide.id}-${index}`} className="step">
                    <span className="step-num">{index + 1}</span>
                    <div className="step-body">
                      <h3>{step.title}</h3>
                      {step.text ? <p>{step.text}</p> : null}
                      <CodeBlock code={step.code} file={step.file} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <div className="container">
            <SectionHead
              eyebrow="Why use it"
              title="Small package, lots of character"
              text="Built for portfolios: easy to drop in, easy to make your own, and light on your bundle."
            />
            <div className="features">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="feature">
                  <span className="feature-icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="api" className="section section-alt">
          <div className="container">
            <SectionHead
              eyebrow="API"
              title="Props"
              text="Everything is optional except the calendar. The full reference, including the SVG renderer and CLI flags, is in the README."
            />
            <div className="table-wrap">
              <table className="props">
                <thead>
                  <tr>
                    <th>Prop</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {PROPS.map(([name, type, value, description]) => (
                    <tr key={name}>
                      <td>
                        <code className="prop-name">{name}</code>
                      </td>
                      <td>
                        <code>{type}</code>
                      </td>
                      <td>
                        <code>{value}</code>
                      </td>
                      <td>{description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta">
              <div>
                <h2>Ready to build your city?</h2>
                <p>Free and open source under the MIT license. Contributions and new styles are welcome.</p>
              </div>
              <div className="cta-actions">
                <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
                  <StarIcon />
                  Star on GitHub
                </a>
                <a className="btn btn-secondary" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
                  Read the docs
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Logo size={18} />
            <span>isometric-contributions</span>
          </div>
          <p>
            Made by <a href={`https://github.com/${DEFAULT_USER}`}>Ros MengHeang</a> · Powers the calendar on{" "}
            <a href="https://taxzy.dev">taxzy.dev</a>
          </p>
          <div className="footer-links">
            <a href={REPO_URL}>GitHub</a>
            <a href={`${REPO_URL}/issues`}>Issues</a>
            <a href={`${REPO_URL}/blob/main/LICENSE`}>MIT License</a>
          </div>
        </div>
      </footer>

      <div className="toast" role="status" aria-live="polite" data-open={toast ? "" : undefined}>
        <CheckIcon />
        {toast}
      </div>
    </>
  )
}
