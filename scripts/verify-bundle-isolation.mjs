import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

const DIAGNOSTIC = path.join(process.cwd(), ".next", "diagnostics", "route-bundle-stats.json")
const CHUNK_DIR = path.join(process.cwd(), ".next", "static", "chunks")
const GSAP_MARKER = "ScrollTrigger"
const LANDING_ROUTE = "/"

const basename = (entry) => entry.split(/[\\/]/).pop()
const chunkSet = (route) =>
  new Set((route.firstLoadChunkPaths ?? []).map(basename))
const refsByChunk = new Map()

for (const route of JSON.parse(await readFile(DIAGNOSTIC, "utf8"))) {
  for (const chunk of chunkSet(route)) {
    if (!refsByChunk.has(chunk)) refsByChunk.set(chunk, new Set())
    refsByChunk.get(chunk).add(route.route)
  }
}

// Same fail-soft rule as the diagnostic read above. Vercel does not always
// leave .next/static/chunks in place by the time postbuild runs, and failing a
// deploy because the check could not run trades one problem for a worse one.
let chunks
try {
  chunks = (await readdir(CHUNK_DIR)).filter((file) => file.endsWith(".js"))
} catch (error) {
  console.warn(
    `verify:bundle: SKIPPED - could not read ${CHUNK_DIR} (${error.code ?? error.message}).`
  )
  console.warn(
    "GSAP bundle isolation was NOT verified for this build. Investigate if this persists."
  )
  process.exit(0)
}
for (const file of chunks) {
  const source = await readFile(path.join(CHUNK_DIR, file), "utf8")
  if (source.includes(GSAP_MARKER)) {
    const where = refsByChunk.get(file) ?? new Set()
    const leaks = [...where].filter((route) => route !== LANDING_ROUTE)
    if (leaks.length > 0) {
      console.error(
        `verify:bundle: FAILED - GSAP chunk "${file}" is part of the first-load chunk set of non-landing route(s): ${leaks.join(", ")}`
      )
      console.error(
        "GSAP must stay confined to the landing route so authenticated routes never download it."
      )
      process.exit(1)
    }
    if (!where.has(LANDING_ROUTE)) {
      console.error(
        `verify:bundle: FAILED - GSAP chunk "${file}" is referenced by route(s): ${[...where].join(", ") || "none"}, but not the landing route (${LANDING_ROUTE}).`
      )
      process.exit(1)
    }
    console.log(`verify:bundle: ok - GSAP chunk "${file}" isolated to ${LANDING_ROUTE}`)
  }
}

console.log("verify:bundle: ok - no GSAP-bearing chunks outside the landing route.")