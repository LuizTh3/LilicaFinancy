import assert from 'node:assert/strict'
import fs from 'node:fs'
const scenarios = []
function candidate(name, u, labels, firstUse, expected, cancel = false, colocated = true) {
  const origem = cancel ? 1 + u : 3 + u
  const receipt = 2 + labels
  const invoices = Array(u).fill(colocated ? 1 : 2)
  const writes = [origem, ...invoices, receipt, ...(firstUse ? [2] : [])]
  const reads = 2 + u * (colocated ? 1 : 2) + Number(firstUse)
  const total = writes.reduce((s, n) => s + n, 0) + reads
  const accepted = total <= 18 && writes.every(n => n <= 8) && writes.length <= 32
  assert.equal(accepted, expected, name)
  scenarios.push({ name, affectedInvoices: u, newLabels: labels, firstUse, total, accessesPerWrite: writes, transactionReadAuthorizations: reads, mutations: writes.length, acceptedByArithmeticOnly: accepted })
}
candidate('create3-existing-no-new-labels-used-category', 3, 0, false, true)
candidate('create2-existing-first-category-use', 2, 0, true, true)
candidate('create1-five-labels-first-category-use', 1, 5, true, true)
candidate('create4-rejected', 4, 0, false, false)
candidate('nominal12-rejected', 12, 0, false, false)
candidate('edit3-same-destinations', 3, 0, false, true)
candidate('edit-union6-rejected', 6, 0, false, false)
candidate('cancel3', 3, 0, false, true, true)
candidate('cancel5-rejected', 5, 0, false, false, true)
candidate('separate-control-create3-still-rejected', 3, 0, false, false, false, false)
const report = { scope: 'proposed-layout-arithmetic-only', scenarios, remoteCompiler: 'NOT_RUN', expressions: 'NOT_MEASURED', allInputSizeBound: 'NOT_PROVEN', productionEnabled: false }
fs.writeFileSync(new URL('../specs/007-compras-cartao-parceladas/finite-budget-proposal.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify({ scenarios: scenarios.length, assertions: 'PASS', remote: 'NOT_RUN', productionEnabled: false }) + '\n')
