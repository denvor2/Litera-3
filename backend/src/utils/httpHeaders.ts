/**
 * Формирует значение заголовка Content-Disposition для скачивания файла.
 *
 * Использует RFC 5987 (filename*=UTF-8''...) с percent-encoding UTF-8 байтов,
 * чтобы кириллические (и любые не-ASCII) имена файлов не ломались при скачивании.
 */
export function getDispositionHeader(filename: string, ext: string): string {
  // RFC 5987: для любого текста используем percent-encoded UTF-8
  const encoded = Buffer.from(`${filename}.${ext}`, 'utf-8')
    .toString('hex')
    .match(/.{2}/g)
    ?.map(h => `%${h}`)
    .join('') || `${filename}.${ext}`
  return `attachment; filename*=UTF-8''${encoded}`
}
