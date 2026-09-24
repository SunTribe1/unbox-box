// Writes public/THIRD_PARTY_NOTICES.txt: the license text of every production dependency
// shipped to the browser. Run with `npm run notices` after changing dependencies.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// `npm ls` exits non-zero for tree warnings (extraneous optional packages) but still prints
// the full tree, so read stdout either way.
function npmTree() {
  const args = ['ls', '--omit=dev', '--all', '--json', '--long', '-w', '@unbox-box/web']
  const opts = {
    cwd: new URL('../../..', import.meta.url).pathname,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  }
  try {
    return execFileSync('npm', args, opts).toString()
  } catch (error) {
    if (error.stdout?.length) return error.stdout.toString()
    throw error
  }
}
const tree = JSON.parse(npmTree())

const seen = new Map()
function walk(deps) {
  for (const [name, info] of Object.entries(deps ?? {})) {
    if (!info.path || name.startsWith('@unbox-box/')) {
      walk(info.dependencies)
      continue
    }
    const key = `${name}@${info.version}`
    if (!seen.has(key)) seen.set(key, info)
    walk(info.dependencies)
  }
}
walk(tree.dependencies)

const licenseText = (dir) => {
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(f))
  return file ? readFileSync(join(dir, file), 'utf8').trim() : null
}

const byText = new Map()
for (const [key, info] of [...seen].sort(([a], [b]) => a.localeCompare(b))) {
  if (!existsSync(info.path)) continue
  const pkg = JSON.parse(readFileSync(join(info.path, 'package.json'), 'utf8'))
  const text = licenseText(info.path) ?? `License: ${pkg.license ?? 'see package'}`
  byText.set(text, [...(byText.get(text) ?? []), key])
}

const out = ['Third-party software included in Unbox Box', '='.repeat(42), '']
for (const [text, packages] of byText) {
  out.push(
    'The following packages:',
    ...packages.map((p) => ` - ${p}`),
    '',
    text,
    '',
    '-'.repeat(72),
    '',
  )
}
// Assets copied into public/ rather than installed from npm.
const VENDORED = [
  [
    'flag-icons 7.5.0 (country flag SVGs in public/flags)',
    new URL('../public/flags/LICENSE.txt', import.meta.url),
  ],
]
for (const [label, file] of VENDORED) {
  out.push(label, '', readFileSync(file, 'utf8').trim(), '', '-'.repeat(72), '')
}
writeFileSync(new URL('../public/THIRD_PARTY_NOTICES.txt', import.meta.url), out.join('\n'))
console.log(`${seen.size} packages, ${byText.size} distinct license texts`)
