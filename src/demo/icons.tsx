import type { ReactNode, SVGProps } from "react"
import type { Variant } from "../index.ts"

function Stroke({ size = 16, children, ...rest }: { size?: number; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

type P = { size?: number }

export const CopyIcon = (p: P) => (
  <Stroke {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Stroke>
)
export const CheckIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Stroke>
)
export const SunIcon = (p: P) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Stroke>
)
export const MoonIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Stroke>
)
export const DownloadIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </Stroke>
)
export const LinkIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Stroke>
)
export const ReplayIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Stroke>
)
export const StarIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Stroke>
)
export const ArrowIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Stroke>
)
export const SearchIcon = (p: P) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Stroke>
)
export const CodeIcon = (p: P) => (
  <Stroke {...p}>
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
  </Stroke>
)
export const LayersIcon = (p: P) => (
  <Stroke {...p}>
    <path d="m12 2 10 5-10 5L2 7l10-5z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </Stroke>
)
export const PaletteIcon = (p: P) => (
  <Stroke {...p}>
    <circle cx="13.5" cy="6.5" r="1.5" />
    <circle cx="17.5" cy="10.5" r="1.5" />
    <circle cx="8.5" cy="7.5" r="1.5" />
    <circle cx="6.5" cy="12.5" r="1.5" />
    <path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z" />
  </Stroke>
)
export const LockIcon = (p: P) => (
  <Stroke {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Stroke>
)
export const ServerIcon = (p: P) => (
  <Stroke {...p}>
    <rect x="2" y="3" width="20" height="8" rx="2" />
    <rect x="2" y="13" width="20" height="8" rx="2" />
    <path d="M6 7h.01M6 17h.01" />
  </Stroke>
)
export const ImageIcon = (p: P) => (
  <Stroke {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </Stroke>
)
export const EyeIcon = (p: P) => (
  <Stroke {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Stroke>
)

export const GitHubIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export const Logo = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path fill="#40c463" d="M2 5.2 8 2l6 3.2-6 3.2z" />
    <path fill="#30a14e" d="M2 5.2 8 8.4V15L2 11.8z" />
    <path fill="#216e39" d="M8 8.4 14 5.2V11.8L8 15z" />
  </svg>
)

function cube(cx: number, cy: number, w: number, h: number) {
  const d = w / 2
  return [
    `M${cx - w},${cy} L${cx},${cy + d} L${cx},${cy + d + h} L${cx - w},${cy + h}Z`,
    `M${cx},${cy + d} L${cx + w},${cy} L${cx + w},${cy + h} L${cx},${cy + d + h}Z`,
    `M${cx},${cy - d} L${cx + w},${cy} L${cx},${cy + d} L${cx - w},${cy}Z`,
  ]
}

function Cubes({ list }: { list: [number, number, number, number][] }) {
  return (
    <>
      {list.map(([cx, cy, w, h], i) => {
        const [left, right, top] = cube(cx, cy, w, h)
        return (
          <g key={i}>
            <path d={left} opacity={0.6} />
            <path d={right} opacity={0.35} />
            <path d={top} />
          </g>
        )
      })}
    </>
  )
}

export function VariantGlyph({ variant }: { variant: Variant }) {
  return (
    <svg className="glyph" viewBox="0 0 48 32" fill="currentColor" aria-hidden="true">
      {variant === "isometric" ? (
        <Cubes list={[[14, 14, 8, 6], [24, 9, 8, 10], [34, 16, 8, 4], [24, 20, 8, 3]]} />
      ) : variant === "city" ? (
        <Cubes list={[[14, 12, 5, 13], [24, 6, 5, 20], [34, 14, 5, 10], [24, 22, 5, 4]]} />
      ) : variant === "flat" ? (
        <>
          {Array.from({ length: 21 }, (_, i) => {
            const col = i % 7
            const row = Math.floor(i / 7)
            const level = [0.25, 0.5, 1, 0.35, 0.75, 0.25, 0.9][(i * 5) % 7]
            return <rect key={i} x={5 + col * 5.6} y={8 + row * 5.6} width={4.4} height={4.4} rx={1} opacity={level} />
          })}
        </>
      ) : (
        <>
          {[10, 16, 8, 22, 13, 18, 11].map((h, i) => (
            <rect key={i} x={5 + i * 5.6} y={28 - h} width={4.6} height={h} rx={0.6} opacity={i % 2 ? 0.55 : 1} />
          ))}
          <rect x={3} y={28} width={42} height={1.6} rx={0.8} opacity={0.4} />
        </>
      )}
    </svg>
  )
}
