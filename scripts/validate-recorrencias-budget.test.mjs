import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avaliarPerfil, intervaloFuturas } from './validate-recorrencias-budget.mjs';
import { readFileSync } from 'node:fs';

test('aceita fronteira18/8 sem presumir cache entre escritas', () => {
  const result = avaliarPerfil({ escritas: [8, 8], leituras: [1, 1] });
  assert.equal(result.total, 18);
  assert.equal(result.dentroDosLimites, true);
});

test('rejeita total19 mesmo com cada escrita dentro de8', () => {
  assert.equal(avaliarPerfil({ escritas: [8, 8], leituras: [1, 1, 1] }).dentroDosLimites, false);
});

test('rejeita uma escrita9 mesmo com total menor que18', () => {
  assert.equal(avaliarPerfil({ escritas: [9], leituras: [] }).dentroDosLimites, false);
});

test('conta leituras autenticadas e controles obrigatórios da composição', () => {
  const result = avaliarPerfil({ escritas: [3, 4, 4, 2, 1], leituras: [1, 1, 1, 1, 1, 1, 1] });
  assert.equal(result.total, 21);
  assert.equal(result.dentroDosLimites, false);
});

test('rejeita mutações33 e contagens não inteiras/negativas/ausentes', () => {
  assert.equal(avaliarPerfil({ escritas: Array(33).fill(0), leituras: [] }).dentroDosLimites, false);
  for (const value of [-1, 1.5, NaN, Infinity]) {
    assert.throws(() => avaliarPerfil({ escritas: [value], leituras: [] }));
  }
  assert.throws(() => avaliarPerfil({ escritas: [], leituras: [] }));
  assert.throws(() => avaliarPerfil({ escritas: [1] }));
});

test('confere todos os mínimos do redesenho, incluindo controles e mudança de cartão', () => {
  const input = JSON.parse(readFileSync(new URL('../specs/010-recorrencias-mensais/rules-budget-profiles.json', import.meta.url), 'utf8'));
  for (const profile of input.perfis.filter(item => item.casoMinimo)) {
    assert.equal(avaliarPerfil(profile).dentroDosLimites, true, profile.id);
  }
  assert.equal(avaliarPerfil(input.perfis.find(item => item.id === 'materializar-cartao-capacidadeEmO')).total, 16);
  assert.equal(avaliarPerfil(input.perfis.find(item => item.id === 'revisarFuturas-cartao-umSlot')).total, 18);
  assert.equal(avaliarPerfil(input.perfis.find(item => item.id === 'antigo-composicao-G-J-separados')).dentroDosLimites, false);
});

test('intervalo inclui meses vazios e termina antes da próxima revisão agendada', () => {
  assert.deepEqual(intervaloFuturas('2027-05', '2027-12', '2027-07'), ['2027-05', '2027-06']);
});

test('watermark ausente/anterior não inventa slots; virada do ano mantém ordinais', () => {
  assert.deepEqual(intervaloFuturas('2027-05', undefined), []);
  assert.deepEqual(intervaloFuturas('2027-05', '2027-04'), []);
  assert.deepEqual(intervaloFuturas('2026-12', '2027-02'), ['2026-12', '2027-01', '2027-02']);
});

test('recusa treze meses mesmo se cliente alegar somente uma ocorrência elegível', () => {
  assert.equal(intervaloFuturas('2027-01', '2027-12').length, 12);
  assert.throws(() => intervaloFuturas('2027-01', '2028-01'), /limiteOperacional/);
});

test('recusa meses e limites de revisão inválidos sem normalização silenciosa', () => {
  for (const invalid of ['1899-12', '10000-01', '2027-13', '2027-1', null]) {
    assert.throws(() => intervaloFuturas(invalid, '2027-12'));
  }
  assert.throws(() => intervaloFuturas('2027-05', '2027-12', '2027-05'));
});
