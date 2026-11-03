import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'

const dir = new URL('../specs/007-compras-cartao-parceladas/', import.meta.url)
const read = name => fs.readFileSync(new URL(name, dir), 'utf8')
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const source = read('firestore-compras-finite.candidate.rules'), manifest = JSON.parse(read('finite-candidate-manifest.json')), suite = JSON.parse(read('finite-rules-evaluation-cases.json'))
assert.equal(hash(source), manifest.candidateSha256)
assert.equal(hash(JSON.stringify(suite)), manifest.suiteSha256)
assert.equal(hash(fs.readFileSync(new URL('../firestore.rules', import.meta.url))), manifest.baseSha256)
assert.equal(Buffer.byteLength(source), manifest.bytes)
assert.ok(manifest.bytes < 256 * 1024)
assert.equal(manifest.productionEnabled, false)
assert.equal(suite.cases.length, manifest.cases)
assert.equal(new Set(suite.cases.map(c => c.name)).size, suite.cases.length)
for (const name of ['create100by3Purchase', 'create100by3Receipt', 'create100by3Invoice1', 'create100by3Invoice2', 'create100by3Invoice3', 'freshEmptyV4Calendar', 'freshEmptyV4Receipt']) assert.equal(suite.cases.find(c => c.name === name)?.test.expectation, 'ALLOW')
for (const name of ['legacyInitializationDenied', 'wrongRemainder', 'recursiveImage', 'wrongDelta', 'financialWriteChangesCalendar', 'purchaseEditDenied', 'firstUseThreeExceeds18', 'visitorReceipt', 'pendingReceipt']) assert.equal(suite.cases.find(c => c.name === name)?.test.expectation, 'DENY')
assert.equal(suite.cases.filter(c => c.name.startsWith('regression006_')).length, 68)
assert.ok(source.includes('7+3*d.quantidadeParcelas+d.etiquetaIds.size()'))
assert.ok(source.includes("allow update,delete: if false;"))
assert.ok(source.includes("f.diff(b).affectedKeys().hasOnly(['conteudo'])"))
assert.ok(source.includes("c.depois.keys().hasOnly(p7ImageKeys())"))
assert.ok(source.includes("request.resource.data.versaoConteudo==1 ? catalogReady(uid)"))
const result = { status: 'PASS_STATIC_ARTIFACT_CHECKS_ONLY', cases: suite.cases.length, candidateSha256: manifest.candidateSha256, suiteSha256: manifest.suiteSha256, compiler: 'NOT_RUN', officialEvaluation: 'NOT_RUN', expressions: 'NOT_MEASURED', productionEnabled: false }
fs.writeFileSync(new URL('finite-local-validation.json', dir), JSON.stringify(result, null, 2) + '\n')
process.stdout.write(JSON.stringify(result) + '\n')
