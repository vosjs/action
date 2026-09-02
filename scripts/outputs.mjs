// Turn `vos push --json`'s done event into step outputs (vos-id, version, watch-url).
import { readFileSync } from 'node:fs'

const [file] = process.argv.slice(2)
const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean)
let done = null
for (const line of lines) {
  try {
    const ev = JSON.parse(line)
    if (ev.event === 'done') done = ev
  } catch {
    // stderr noise never reaches this file; a non-JSON line is ignored
  }
}
if (!done?.vosId) process.exit(0)
const origin = process.env.VOS_ORIGIN?.replace(/\/+$/, '') || 'https://vos.so'
process.stdout.write(`vos-id=${done.vosId}\n`)
process.stdout.write(`version=${done.versionNumber ?? ''}\n`)
process.stdout.write(`watch-url=${origin}/vos/${done.vosId}\n`)
