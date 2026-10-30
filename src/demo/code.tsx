import { useState, type ReactNode } from "react"
import { CheckIcon, CopyIcon } from "./icons.tsx"

const TOKEN =
  /(\/\/[^\n]*|<!--[\s\S]*?-->|(?<=^|\s)#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`[^`]*`)|\b(import|from|export|async|function|const|return|await|default|npm|npx|install)\b|(<\/?[A-Za-z][\w.-]*|\/>)/gm

const KINDS = ["comment", "string", "keyword", "tag"] as const

function highlight(code: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(code.slice(last, index))
    const kind = KINDS[match.slice(1).findIndex(Boolean)]
    nodes.push(
      <span key={index} className={`tok-${kind}`}>
        {match[0]}
      </span>,
    )
    last = index + match[0].length
  }
  if (last < code.length) nodes.push(code.slice(last))
  return nodes
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={className ?? "copy-btn"}
      aria-label={done ? "Copied" : label}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          window.setTimeout(() => setDone(false), 1500)
        }
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
      <span>{done ? "Copied" : label}</span>
    </button>
  )
}

export function CodeBlock({ code, file }: { code: string; file?: string }) {
  return (
    <div className="codeblock">
      <div className="codeblock-bar">
        <span className="codeblock-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="codeblock-file">{file}</span>
        <CopyButton text={code} />
      </div>
      <pre>
        <code>{highlight(code)}</code>
      </pre>
    </div>
  )
}
