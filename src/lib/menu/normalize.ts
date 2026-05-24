export function normalizeRu(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = normalizeRu(haystack)
  const tokens = normalizeRu(needle).split(' ').filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((t) => h.includes(t))
}
