# isometric-contributions

An isometric SVG calendar of GitHub contributions, drawn as a city of blocks. Each day is a building: height follows that day's count, and color is GitHub's contribution level.

This is the calendar on [taxzy.dev](https://taxzy.dev). It is a small React + TypeScript component, MIT licensed, by [Ros MengHeang](https://github.com/RosMengHeang) (Taxzy).

[Live showcase](https://taxzy.dev)

![Isometric contribution calendar for RosMengHeang](docs/demo.png)

## Demo

```bash
git clone https://github.com/RosMengHeang/isometric-contributions.git
cd isometric-contributions
npm install
npm run dev
```

The dev server opens a page that loads **RosMengHeang** by default. Change the username in the form, or visit `/?user=octocat`. Accent color and a dark-mode toggle are on the page.

`npm run build` typechecks and writes the static demo to `dist/`. `npm run preview` serves that build.

GitHub's contribution page does not send CORS headers, so a browser cannot read it directly. The Vite dev and preview servers proxy `https://github.com/users/<username>/contributions` through `/api/github/<username>/contributions`. In an app, fetch on the server and pass the result in as a prop.

## Install

The package ships as TypeScript source. Copy the four library files into your app:

- `src/index.ts`
- `src/IsometricContributions.tsx`
- `src/contributions.ts`
- `src/iso-styles.css`

Or install from GitHub. Peer dependency: React 18 or newer.

```bash
npm install github:RosMengHeang/isometric-contributions
```

Vite can import the source as-is. Next.js needs the package in `transpilePackages`:

```js
// next.config.js
const nextConfig = {
  transpilePackages: ["isometric-contributions"],
}
```

`IsometricContributions.tsx` imports `iso-styles.css`. If a bundler drops CSS from dependencies, import `isometric-contributions/styles.css` yourself.

## Usage

Fetch in a Server Component (or any other server runtime) and render the chart. The component is marked `"use client"` because hover state uses `useState`. Import the fetcher from `isometric-contributions/contributions` so the request stays on the server when the chart is a client boundary.

```tsx
import { IsometricContributions } from "isometric-contributions"
import { fetchContributionCalendar } from "isometric-contributions/contributions"

export async function GitHubActivity({ username }: { username: string }) {
  const calendar = await fetchContributionCalendar(username)
  return (
    <IsometricContributions
      calendar={calendar}
      username={username}
      accentColor="#0a3986"
    />
  )
}
```

The main entry also re-exports the parser and the fetcher for client apps and scripts:

```ts
import {
  IsometricContributions,
  fetchContributionCalendar,
  parseContributionCalendar,
  type ContributionCalendar,
  type ContributionDay,
} from "isometric-contributions"
```

`fetchContributionCalendar` accepts an optional `RequestInit` as its second argument (`{ cache: "no-store" }`, extra headers, and so on).

## How the HTML parse works

`fetchContributionCalendar(username)` requests:

```text
https://github.com/users/<username>/contributions
```

That URL is the public profile graph. The fetch sends no personal access token and does not call the GitHub REST API.

`parseContributionCalendar(html)` reads two things out of that fragment:

1. Each day is a `<td class="ContributionCalendar-day">` with `data-date`, `data-level` (`0`–`4`), and `id="contribution-day-component-{weekday}-{week}"`. Weekday `0` is Sunday. Cells GitHub does not render (future days in the current week) stay `null`.
2. The count is not on the cell. A sibling `<tool-tip for="that-id">` holds text such as `3 contributions on March 2nd.` or `No contributions on March 3rd.` Commas in large counts are ignored.

Weeks are `calendar.weeks[column][weekday]`. `calendar.total` is the sum of every parsed day. When the HTML has no cells, the parser returns `null`, and the component shows an empty state with a link to `https://github.com/<username>`.

GitHub can change this markup. A failed parse becomes the empty state rather than a thrown error.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `calendar` | `ContributionCalendar \| null` | — | Parsed year. `null` renders the empty state. |
| `username` | `string` | `"octocat"` | GitHub login used in the empty-state link. |
| `className` | `string` | — | Extra class on the root element. |
| `accentColor` | `string` | `"#0a3986"` | Mixed into the active building's roof and used as its stroke. Set with the CSS variable `--iso-accent`. |

```ts
type ContributionDay = {
  date: string // YYYY-MM-DD
  count: number
  level: number // 0–4
}

type ContributionCalendar = {
  total: number
  weeks: (ContributionDay | null)[][]
}
```

Hover a building, or tap it, and that day appears under the legend. Moving the pointer off the chart clears it. The header shows the best streak, the busiest day, and the average per day. Building height is scaled to the busiest day in the year. Empty days stay flat.

## Dark mode

The light green ramp is the default. Add the class `dark` to any ancestor — the same hook Tailwind's class strategy uses — and the cells, legend, card, and type switch to the dark ramp:

```css
.dark .iso-cal { /* GitHub's dark contribution greens */ }
```

The demo toggles that class on `<html>`.

## Credits

The contribution calendar on [taxzy.dev](https://taxzy.dev) is this component. It was extracted from Ros MengHeang's portfolio so it can be reused on its own.

## License

[MIT](LICENSE) © 2026 Ros MengHeang
