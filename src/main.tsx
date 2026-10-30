import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./demo/App.tsx"
import "./demo/demo.css"

const root = document.getElementById("root")
if (!root) throw new Error("Root element #root is missing")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
