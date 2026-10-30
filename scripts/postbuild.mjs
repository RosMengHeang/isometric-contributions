// Runs after `tsc -p tsconfig.build.json`. tsc does not copy CSS, and the
// `import "./iso-styles.css"` it keeps in .d.ts files breaks consumers without CSS module types.
// Declaration emit also keeps `.ts` specifiers, which only resolve with allowImportingTsExtensions.
import { chmod, copyFile, readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const dist = new URL("../dist/", import.meta.url).pathname

await copyFile(new URL("../src/iso-styles.css", import.meta.url), join(dist, "iso-styles.css"))

for (const name of await readdir(dist)) {
  if (!name.endsWith(".d.ts")) continue
  const file = join(dist, name)
  const source = await readFile(file, "utf8")
  const stripped = source
    .replace(/^import "\.\/[^"]+\.css";\n/gm, "")
    .replace(/(from "\.{1,2}\/[^"]+)\.tsx?"/g, '$1.js"')
  if (stripped !== source) await writeFile(file, stripped)
}

await chmod(join(dist, "cli.js"), 0o755)
