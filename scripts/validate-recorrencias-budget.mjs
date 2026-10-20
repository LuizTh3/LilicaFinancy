import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export function avaliarPerfil(perfil) {
  if (!perfil || !Array.isArray(perfil.escritas) || !perfil.escritas.length || !Array.isArray(perfil.leituras)) {
    throw new TypeError('Informe escritas não vazias e autorizações de leituras.');
  }
  const accesses = [...perfil.escritas, ...perfil.leituras];
  if (!accesses.every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new TypeError('Contagem deve ser inteira, segura e não negativa.');
  }
  const total = accesses.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) throw new TypeError('Soma fora da faixa segura.');
  return {
    total,
    maiorEscrita: Math.max(...perfil.escritas),
    mutacoes: perfil.escritas.length,
    dentroDosLimites: total <= 18 && perfil.escritas.every(value => value <= 8) && perfil.escritas.length <= 32,
  };
}

export function intervaloFuturas(vigencia, ultimoMesOcupado, proximaRevisao) {
  const index = value => {
    if (typeof value !== 'string' || !/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(value)) {
      throw new TypeError('dataInvalida: mês fora do calendário1900–9999.');
    }
    return Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1;
  };
  const first = index(vigencia);
  const next = proximaRevisao === undefined ? undefined : index(proximaRevisao);
  if (next !== undefined && next <= first) throw new TypeError('dataInvalida: próxima revisão não posterior.');
  if (ultimoMesOcupado === undefined) return [];
  const last = Math.min(index(ultimoMesOcupado), next === undefined ? Infinity : next - 1);
  if (last < first) return [];
  if (last - first + 1 > 12) throw new RangeError('limiteOperacional: intervalo canônico acima12 meses.');
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const monthIndex = first + offset;
    return `${Math.floor(monthIndex / 12)}-${String(monthIndex % 12 + 1).padStart(2, '0')}`;
  });
}

const root = new URL('../', import.meta.url);
const feature = new URL('specs/010-recorrencias-mensais/', root);

async function main() {
  const input = JSON.parse(await readFile(new URL('rules-budget-profiles.json', feature), 'utf8'));
  const profiles = input.perfis.map(perfil => ({ ...perfil, ...avaliarPerfil(perfil) }));
  const sources = {};
  for (const path of input.fontes) {
    sources[path] = createHash('sha256').update(await readFile(new URL(path, root))).digest('hex');
  }
  const failures = profiles.filter(perfil => perfil.casoMinimo && !perfil.dentroDosLimites);
  const report = {
    scope: 'documented-composition-call-graphs-only',
    gate: failures.length ? 'ERROR_DESENHO_COMPOSTO' : 'PENDENTE_PROVA_EXECUTAVEL',
    limites: { acessos: 18, acessosPorEscrita: 8, mutacoes: 32 },
    profiles,
    falhasMinimas: failures.map(perfil => perfil.id),
    fontesSha256: sources,
    compiler: 'NOT_RUN',
    expressions: 'NOT_MEASURED',
    bytes: 'NOT_PROVEN',
    officialEvaluation: 'NOT_RUN',
    deployment: 'NOT_RUN',
    grafosMinimosDocumentados: input.perfis.filter(perfil => perfil.casoMinimo).map(perfil => perfil.id), coberturaCompletaDeComandos: false,
    observacao: 'Falha deste grafo exige redesenho; não demonstra impossibilidade de todas as arquiteturas. Não é aprovação de Rules nem medição remota.',
  };
  await writeFile(new URL('rules-budget-report.json', feature), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ gate: report.gate, profiles: profiles.length, falhasMinimas: report.falhasMinimas }) + '\n');
  if (failures.length) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

