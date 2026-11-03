// Resources live only for the current private session. No financial payload is kept here.
const resources = new Set<() => void>()
export function registerPrivateFinanceResource(dispose: () => void): () => void {
 resources.add(dispose)
 return () => { resources.delete(dispose) }
}
export function clearPrivateFinanceResources(): void {
 const pending = [...resources]
 resources.clear()
 for (const dispose of pending) { try { dispose() } catch { /* One failed cleanup cannot retain the other user's resources. */ } }
}
