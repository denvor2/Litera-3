import { describe, it, expect } from 'vitest'
import {
  countWords,
  countCharacters,
  extractTextFromTipTap,
  countAuthorSheets,
  countPages,
} from './wordCount'

describe('wordCount', () => {
  describe('countWords', () => {
    it('should return 0 for empty string', () => {
      expect(countWords('')).toBe(0)
    })

    it('should count words correctly', () => {
      expect(countWords('hello world')).toBe(2)
      expect(countWords('hello world test')).toBe(3)
    })

    it('should ignore extra whitespace', () => {
      expect(countWords('  hello   world  ')).toBe(2)
    })

    it('should count Russian words', () => {
      expect(countWords('привет мир')).toBe(2)
    })
  })

  describe('countCharacters', () => {
    it('should return 0 for empty string', () => {
      expect(countCharacters('')).toBe(0)
    })

    it('should count characters with spaces', () => {
      expect(countCharacters('hello world')).toBe(11)
    })

    it('should count characters without spaces', () => {
      expect(countCharacters('hello world', false)).toBe(10)
    })
  })

  describe('extractTextFromTipTap', () => {
    it('should return empty string for invalid input', () => {
      expect(extractTextFromTipTap(null)).toBe('')
      expect(extractTextFromTipTap(undefined)).toBe('')
      expect(extractTextFromTipTap('not an object')).toBe('')
      expect(extractTextFromTipTap({})).toBe('')
    })

    it('should extract text from a single paragraph', () => {
      const doc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'привет мир' }] },
        ],
      }
      expect(extractTextFromTipTap(doc)).toBe('привет мир')
    })

    it('should join top-level nodes with newlines', () => {
      const doc = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'первый' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'второй' }] },
        ],
      }
      expect(extractTextFromTipTap(doc)).toBe('первый\nвторой')
    })

    it('should concatenate multiple text nodes within a paragraph', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'жирный' },
              { type: 'text', text: ' обычный' },
            ],
          },
        ],
      }
      expect(extractTextFromTipTap(doc)).toBe('жирный обычный')
    })
  })

  describe('countAuthorSheets', () => {
    it('should return 0 for empty text', () => {
      expect(countAuthorSheets(0)).toBe(0)
    })

    it('should compute author sheets at 40000 chars per sheet', () => {
      expect(countAuthorSheets(40000)).toBe(1)
      expect(countAuthorSheets(20000)).toBe(0.5)
    })
  })

  describe('countPages', () => {
    it('should return 0 for empty text', () => {
      expect(countPages(0)).toBe(0)
    })

    it('should compute pages at 1800 chars per page', () => {
      expect(countPages(1800)).toBe(1)
      expect(countPages(3600)).toBe(2)
    })
  })
})
