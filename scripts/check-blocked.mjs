#!/usr/bin/env node
/**
 * Build content check.
 *
 * Reads a list of identifiers from blocklist.json and fails if any of them
 * appears in the build output. Runs from `predeploy`, so a deploy cannot skip
 * it.
 *
 * blocklist.json is not part of this repository. Without it the check aborts
 * with exit code 2 instead of reporting success, so a missing list can never
 * look like a clean result.
 *
 * Exit codes: 0 clean, 1 match found, 2 check could not run.
 *
 * Two pattern classes:
 *
 *   strict      Identifiers specific enough that any occurrence is a real
 *               match. Matched anywhere.
 *
 *   contextual  Short identifiers that also occur as random substrings in
 *               minified code and in base64 hashes. Matched only as a quoted
 *               string or as an object key, so ordinary builds do not produce
 *               false alarms.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIST = join(ROOT, 'blocklist.json')
const TARGET = process.argv[2] ?? 'dist'

const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.css', '.html', '.json', '.geojson',
  '.svg', '.txt', '.map', '.csv', '.md', '.webmanifest',
])

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function loadList() {
  if (!existsSync(LIST)) {
    console.error(
      '\ncheck-blocked: blocklist.json not found.\n\n' +
      'This file is intentionally not tracked. Create it in the project root:\n\n' +
      '  { "strict": ["example_field"], "contextual": ["ex1"] }\n\n' +
      'strict     matched anywhere\n' +
      'contextual matched only as "term" or term:\n\n' +
      'Aborting. A missing list is not a pass.\n'
    )
    process.exit(2)
  }
  let parsed
  try {
    parsed = JSON.parse(readFileSync(LIST, 'utf8'))
  } catch (err) {
    console.error(`check-blocked: blocklist.json is not valid JSON. ${err.message}`)
    process.exit(2)
  }
  const strict = parsed.strict ?? []
  const contextual = parsed.contextual ?? []
  if (strict.length + contextual.length === 0) {
    console.error('check-blocked: blocklist.json contains no terms. Aborting.')
    process.exit(2)
  }
  return [
    ...strict.map((t) => ({ term: t, re: new RegExp(escape(t), 'gi'), kind: 'strict' })),
    ...contextual.map((t) => ({
      term: t,
      re: new RegExp(`["']${escape(t)}["']|\\b${escape(t)}\\s*:`, 'g'),
      kind: 'contextual',
    })),
  ]
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* walk(full)
    else yield full
  }
}

function main() {
  const patterns = loadList()

  if (!existsSync(TARGET)) {
    console.error(`check-blocked: "${TARGET}" does not exist. Run the build first.`)
    process.exit(2)
  }

  const findings = []
  let scanned = 0

  for (const file of walk(TARGET)) {
    if (!TEXT_EXT.has(extname(file).toLowerCase())) continue
    scanned++
    const content = readFileSync(file, 'utf8')
    for (const { term, re, kind } of patterns) {
      re.lastIndex = 0
      const hit = re.exec(content)
      if (!hit) continue
      const line = content.slice(0, hit.index).split('\n').length
      const context = content
        .slice(Math.max(0, hit.index - 40), hit.index + term.length + 40)
        .replace(/\s+/g, ' ')
      findings.push({ file: relative(process.cwd(), file), line, term, kind, context })
    }
  }

  if (findings.length === 0) {
    console.log(
      `check-blocked: OK. ${patterns.length} term(s) checked against ` +
      `${scanned} text file(s) in "${TARGET}".`
    )
    process.exit(0)
  }

  console.error(`\ncheck-blocked: MATCH IN BUILD (${findings.length})\n`)
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.kind}] ${f.term}`)
    console.error(`      ...${f.context}...`)
  }
  console.error('\nDeploy aborted.\n')
  process.exit(1)
}

main()
