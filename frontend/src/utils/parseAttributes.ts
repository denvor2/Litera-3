export function parseAttributes(attributes: unknown): Record<string, any> {
  if (!attributes) return {}
  if (typeof attributes === 'string') {
    try {
      return JSON.parse(attributes)
    } catch {
      return {}
    }
  }
  if (typeof attributes === 'object') {
    return attributes as Record<string, any>
  }
  return {}
}
