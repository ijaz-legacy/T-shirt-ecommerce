export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN')
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
}
