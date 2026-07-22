import { describe, it, expect } from 'vitest'
import { getDispositionHeader } from '../utils/httpHeaders'

describe('getDispositionHeader (RFC 5987)', () => {
  function decodeExtValue(header: string): string {
    const marker = "UTF-8''"
    const idx = header.indexOf(marker)
    if (idx === -1) throw new Error('Нет RFC 5987 расширенного значения в заголовке')
    return decodeURIComponent(header.slice(idx + marker.length))
  }

  it('happy path: кириллическое имя кодируется в RFC 5987 и декодируется обратно', () => {
    const header = getDispositionHeader('Война и мир', 'fb2')

    expect(header).toContain("filename*=UTF-8''")
    // Заголовок должен состоять только из ASCII (percent-encoded), без сырой кириллицы
    expect(/^[\x00-\x7F]*$/.test(header)).toBe(true)
    // Round-trip: декодированное значение совпадает с исходным именем + расширение
    expect(decodeExtValue(header)).toBe('Война и мир.fb2')
  })

  it('percent-encoding использует UTF-8 байты (проверка конкретной последовательности)', () => {
    const header = getDispositionHeader('Книга', 'pdf')
    // 'Книга' в UTF-8: d0 9a d0 bd d0 b8 d0 b3 d0 b0, затем '.pdf' = 2e 70 64 66
    expect(header).toBe(
      "attachment; filename*=UTF-8''%d0%9a%d0%bd%d0%b8%d0%b3%d0%b0%2e%70%64%66"
    )
    expect(decodeExtValue(header)).toBe('Книга.pdf')
  })

  it('граничная ситуация: спецсимволы и пробелы кодируются, а не ломают заголовок', () => {
    const header = getDispositionHeader('Отчёт «2026»: черновик/финал', 'docx')
    // Не должно быть сырых кавычек, двоеточий, слэшей или пробелов в значении
    const value = header.slice(header.indexOf("UTF-8''") + "UTF-8''".length)
    expect(value).not.toMatch(/[\s"/:«»]/)
    expect(decodeExtValue(header)).toBe('Отчёт «2026»: черновик/финал.docx')
  })

  it('граничная ситуация: чисто ASCII имя тоже валидно кодируется и декодируется', () => {
    const header = getDispositionHeader('MyBook', 'pdf')
    expect(header.startsWith('attachment; ')).toBe(true)
    expect(decodeExtValue(header)).toBe('MyBook.pdf')
  })
})
