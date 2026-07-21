import { describe, it, expect } from 'vitest'
import { countWords, countCharacters, estimatePages } from './wordCount'

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

  describe('estimatePages', () => {
    it('should estimate pages correctly', () => {
      expect(estimatePages(250)).toBe(1)
      expect(estimatePages(500)).toBe(2)
      expect(estimatePages(251)).toBe(2)
    })

    it('should use custom words per page', () => {
      expect(estimatePages(500, 100)).toBe(5)
    })
  })
})
