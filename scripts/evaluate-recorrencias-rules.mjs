import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const folder = new URL('../specs/010-recorrencias-mensais/', import.meta.url);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync(new URL('firestore-recorrencias.candidate.rules', folder), 'utf8');
const suite = JSON.parse(fs.readFileSync(new URL('rules-evaluation-cases.json', folder), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(new URL('candidate-manifest.json', folder), 'utf8'));
if (hash(source) !== manifest.candidateSha256) throw Error('CANDIDATE_HASH_MISMATCH');
const requested = process.argv.find(value => value.startsWith('--case='))?.slice(7);
const selected = requested ? suite.cases.filter(item => item.name === requested) : process.argv.includes('--smoke') ? suite.cases.filter(item => ['create-despesaExternaSeries', 'create-despesaExternaReceipt', 'create-despesaExternaRevisionserie-202610', 'generate-assinaturaCartaoSeries', 'generate-assinaturaCartaoReceipt', 'generate-assinaturaCartaoOccurrencer10-serie-202611', 'generate-assinaturaCartaoInvoiceControl', 'initializeControl', 'initializeReceipt'].includes(item.name)) : suite.cases;
if (!selected.length) throw Error('NO_SELECTED_CASES');
const report = { mode: 'official-test-only-no-release', project: 'lilicafinancy', destination: 'firebaserules.googleapis.com', sourceSha256: hash(source), suiteSha256: hash(JSON.stringify(suite)), selectedCases: selected.length, officialRequestsCompleted: 0, state: 'AWAITING_EXPLICIT_SOURCE_DISCLOSURE_AUTHORIZATION', compiler: 'NOT_RUN', expressions: 'NOT_MEASURED', deployment: 'NOT_RUN', issues: [], results: [] };
if (process.argv.includes('--authorized-source-disclosure')) {
  try {
    const provider = process.env.RULES_EVALUATION_PROVIDER ? pathToFileURL(process.env.RULES_EVALUATION_PROVIDER) : new URL('../.integration/firebase005-ops.mjs', import.meta.url);
    const { project, rulesHost, request } = await import(provider);
    if (rulesHost !== report.destination || project !== report.project || typeof request !== 'function') throw Error('INVALID_EVALUATION_SCOPE');
    report.state = 'EVALUATING';
    for (let offset = 0; offset < selected.length; offset += 12) {
      const batch = selected.slice(offset, offset + 12);
      const result = await request(rulesHost, `projects/${project}:test`, 'POST', { source: { files: [{ name: 'firestore.rules', content: source }] }, testSuite: { testCases: batch.map(item => item.test) } });
      report.officialRequestsCompleted++;
      fs.writeFileSync(new URL(`rules-evaluation-${String(offset / 12).padStart(2, '0')}.json`, folder), JSON.stringify(result, null, 2) + '\n');
      report.issues.push(...(result.issues ?? []).map(item => ({ severity: item.severity, line: item.sourcePosition?.line, description: item.description })));
      report.results.push(...(result.testResults ?? []).map((item, index) => ({ name: batch[index]?.name, expected: batch[index]?.test.expectation, state: item.state, debug: item.debugMessages ?? [], calls: item.functionCalls?.length ?? 0 })));
      if (report.issues.some(item => item.severity === 'ERROR')) break;
    }
    report.compiler = report.issues.some(item => item.severity === 'ERROR') ? 'ERROR' : report.officialRequestsCompleted ? 'COMPILED' : 'NOT_RUN';
    report.ok = report.results.length === selected.length && report.results.every(item => item.state === 'SUCCESS' && !item.debug.some(message => /1000|maximum.*expressions|exceeded|unmocked/i.test(typeof message === 'string' ? message : JSON.stringify(message)))) && report.compiler === 'COMPILED';
    report.state = report.ok ? 'SELECTED_CASES_PASSED' : 'ERROR_EVALUATION';
  } catch (error) {
    report.ok = false;
    report.state = 'EVALUATION_UNAVAILABLE';
    report.error = {
      name: error?.name ?? 'Error',
      status: Number.isInteger(error?.status) ? error.status : null,
      code: typeof error?.apiCode === 'string' && /^[A-Z_]+$/.test(error.apiCode) ? error.apiCode : null,
    };
    // Never copy provider credentials, headers or arbitrary request/error details.
  }
}
fs.writeFileSync(new URL('rules-evaluation-summary.json', folder), JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({ state: report.state, selectedCases: selected.length, officialRequestsCompleted: report.officialRequestsCompleted, compiler: report.compiler, deployment: report.deployment }) + '\n');
if (!report.ok) process.exitCode = report.officialRequestsCompleted ? 1 : 2;
