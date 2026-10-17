/// <reference types="node" />
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { expect, it } from 'vitest'
import ts from 'typescript'

// Test-only graph reader. Even type-only imports and re-exports traverse the boundary.
function violations(entries: readonly string[], read: (path: string) => string | undefined) {
  const seen = new Set<string>()
  const errors: string[] = []
  function visit(path: string) {
    if (seen.has(path)) return
    seen.add(path)
    const source = read(path)
    if (source === undefined) { errors.push(`Unresolved: ${path}`); return }
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    function dependency(name: string) {
      if (!name.startsWith('.') || /(?:^|\/)(?:app|features|infrastructure)(?:\/|$)/.test(name)) { errors.push(`Forbidden import: ${name}`); return }
      const base = resolve(dirname(path), name)
      const target = [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts')].find(item => read(item) !== undefined)
      if (!target || /(?:\.test\.|\.testSupport\.)/.test(target)) { errors.push(`Unresolved or test import: ${name}`); return }
      visit(target)
    }
    function walk(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) dependency(node.moduleSpecifier.text)
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) dependency(node.argument.literal.text)
      if (ts.isImportEqualsDeclaration(node)) errors.push('Require import is forbidden')
      if (ts.isCallExpression(node)) {
        const expr = node.expression
        if (expr.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(expr) && ['require', 'fetch', 'eval', 'setTimeout', 'setInterval'].includes(expr.text))) errors.push('Dynamic import or I/O is forbidden')
      }
      if (ts.isPropertyAccessExpression(node) && ['Date.now', 'Math.random', 'crypto.randomUUID', 'performance.now'].includes(node.getText(ast))) errors.push('Implicit clock or identity')
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Date' && (!node.arguments || node.arguments.length === 0)) errors.push('Implicit Date clock')
      ts.forEachChild(node, walk)
    }
    walk(ast)
  }
  entries.forEach(visit)
  return errors
}
it('detecta dependências indiretas, reexports, tipos, relógio e import dinâmico', () => {
  const base = resolve('synthetic')
  const graph = new Map([[resolve(base, 'a.ts'), "import type { X } from './b'"], [resolve(base, 'b.ts'), "export { X } from 'firebase'" ]])
  expect(violations([resolve(base, 'a.ts')], path => graph.get(path))).toContain('Forbidden import: firebase')
  graph.set(resolve(base, 'b.ts'), 'export type X = number')
  expect(violations([resolve(base, 'a.ts')], path => graph.get(path))).toEqual([])
  for (const code of ['import("./b")', 'Date.now()', 'new Date()', 'Math.random()', 'type T = import("react").T', 'fetch("x")']) {
    graph.set(resolve(base, 'a.ts'), code)
    expect(violations([resolve(base, 'a.ts')], path => graph.get(path)).length).toBeGreaterThan(0)
  }
})
it('mantém todos os imports transitivos do núcleo e assinatura dentro do domínio', () => {
  const root = resolve('src/domain/finance')
  const collect = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? collect(resolve(dir, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.(?:test|testSupport)\./.test(entry.name) ? [resolve(dir, entry.name)] : [])
  const entries = [...collect(root), resolve('src/domain/subscription.ts')]
  expect(entries.length).toBeGreaterThan(1)
  expect(violations(entries, path => existsSync(path) ? readFileSync(path, 'utf8') : undefined)).toEqual([])
})
