export function countWords(text: string): number {
  if (!text) return 0
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length
}

export function countCharacters(text: string, withSpaces: boolean = true): number {
  if (!text) return 0
  if (withSpaces) return text.length
  return text.replace(/\s/g, '').length
}

export function estimatePages(wordCount: number, wordsPerPage: number = 250): number {
  return Math.ceil(wordCount / wordsPerPage)
}
