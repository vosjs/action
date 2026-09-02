// One sticky comment per pull request: the watch page, the kit table, what
// was skipped and why, and the verifier's count. Found by its marker and
// updated in place, so a PR with ten pushes has one comment, not ten.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const MARKER = '<!-- vos-release-media -->'
const {
  RELEASE = '',
  KIT = '',
  PUSH = '',
  VALIDATE = '',
  REPO = '',
  PR = '',
  RUN_URL = '',
  ARTIFACT = '',
} = process.env

const lastDone = (file) => {
  if (!file || !existsSync(file)) return null
  let done = null
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    try {
      const ev = JSON.parse(line)
      if (ev.event === 'done') done = ev
    } catch {}
  }
  return done
}

const kit = existsSync(KIT) ? JSON.parse(readFileSync(KIT, 'utf8')) : null
const push = lastDone(PUSH)
const verdict = lastDone(VALIDATE)
const origin = process.env.VOS_ORIGIN?.replace(/\/+$/, '') || 'https://vos.so'

const kb = (n) => `${Math.max(1, Math.round(n / 1024))} KB`
const secs = (s) => (s === null || s === undefined ? '' : `${s.toFixed(1)} s`)

const lines = [MARKER, `### Release media for \`${RELEASE}\``, '']
if (push?.vosId) {
  lines.push(
    `**Watch** ${origin}/vos/${push.vosId} (v${push.versionNumber ?? '?'}) · **edit** ${origin}/studio?vos=${push.vosId} · \`vos pull\` brings studio edits back.`,
    '',
  )
} else {
  lines.push(
    `Not pushed: no \`VOS_API_KEY\` was given, so the take stayed in the runner. Add the secret and the next run versions it on your shelf.`,
    '',
  )
}
if (kit?.assets?.length) {
  lines.push('| Channel | Asset | Size | Bytes | Length | Moment |', '| --- | --- | --- | --- | --- | --- |')
  for (const a of kit.assets) {
    lines.push(
      `| ${a.channel} | ${a.asset}${a.source === 'poster' ? ' (poster)' : ''} | ${a.w}x${a.h} | ${kb(a.bytes)} | ${secs(a.seconds)} | ${a.frameTime !== null && a.frameTime !== undefined ? `${a.frameTime.toFixed(1)} s` : ''} |`,
    )
  }
  lines.push('')
}
if (kit?.skipped?.length) {
  lines.push('**Skipped, with the reason:**', '')
  for (const s of kit.skipped) lines.push(`- ${s}`)
  lines.push('')
}
if (verdict) {
  const n = verdict.problems?.length ?? 0
  const m = verdict.measured?.length ?? kit?.assets?.length ?? 0
  lines.push(
    n === 0
      ? `**Verifier:** 0 problems across ${m} asset${m === 1 ? '' : 's'}, re-measured from their bytes.`
      : `**Verifier:** ${n} problem${n === 1 ? '' : 's'} across ${m} assets:`,
  )
  if (n) for (const p of verdict.problems) lines.push(`- ${p}`)
  lines.push('')
}
lines.push(
  `The kit is attached to [the run](${RUN_URL}) as the artifact \`${ARTIFACT}\`. Made by [vos](https://vos.so/cli): the next release is a re-render of the same \`actions.json\`, not a re-shoot.`,
)
const body = lines.join('\n')
if (process.env.DRY || !PR) {
  process.stdout.write(body + '\n')
  process.exit(0)
}

const gh = (args, input) =>
  execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] })

const existing = JSON.parse(
  gh(['api', `repos/${REPO}/issues/${PR}/comments?per_page=100`]),
).find((c) => typeof c.body === 'string' && c.body.startsWith(MARKER))

const payload = JSON.stringify({ body })
if (existing) {
  gh(['api', '-X', 'PATCH', `repos/${REPO}/issues/comments/${existing.id}`, '--input', '-'], payload)
  console.log(`updated comment ${existing.id}`)
} else {
  const created = JSON.parse(gh(['api', '-X', 'POST', `repos/${REPO}/issues/${PR}/comments`, '--input', '-'], payload))
  console.log(`created comment ${created.id}`)
}
