import fs from 'node:fs'
import crypto from 'node:crypto'
import { project, request, rulesHost } from '../.integration/firebase005-ops.mjs'

// Read-only metadata verification; never publish a ruleset or update a release.
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const report = { clientDate: '2026-10-25', project, mode: 'read-only-active-rules', publication: 'NOT_RUN' }
try {
  if (project !== 'lilicafinancy' || rulesHost !== 'firebaserules.googleapis.com') throw Error('SCOPE_MISMATCH')
  const release = await request(rulesHost, `projects/${project}/releases/cloud.firestore`)
  if (typeof release.rulesetName !== 'string' || !release.rulesetName.startsWith(`projects/${project}/rulesets/`)) throw Error('RELEASE_SCOPE_MISMATCH')
  const source = await request(rulesHost, release.rulesetName)
  if (source.source?.files?.length !== 1 || typeof source.source.files[0].content !== 'string') throw Error('SOURCE_SHAPE_MISMATCH')
  report.activeSourceSha256 = hash(source.source.files[0].content)
  report.localSourceSha256 = hash(fs.readFileSync('firestore.rules', 'utf8'))
  report.activeMatchesLocal = report.activeSourceSha256 === report.localSourceSha256
  report.ok = report.activeMatchesLocal
} catch (e) {
  report.ok = false
  report.error = { status: Number.isInteger(e?.status) ? e.status : null, code: ['SCOPE_MISMATCH', 'RELEASE_SCOPE_MISMATCH', 'SOURCE_SHAPE_MISMATCH'].includes(e?.message) ? e.message : 'METADATA_CHECK_UNAVAILABLE' }
}
fs.writeFileSync('.integration/final-active-rules.json', JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify(report) + '\n')
if (!report.ok) process.exitCode = 1
