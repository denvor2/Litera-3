export interface User {
  id: string
  email: string
  name: string
}

export interface Project {
  id: string
  title: string
  synopsis?: string
  ownerId: string
  books: Book[]
  codexEntries?: CodexEntry[]
  notes?: Note[]
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  projectId: string
  title: string
  genre?: string
  description?: string
  synopsis?: string
  plannedCharCount?: number | null
  plannedAuthorSheets?: number | null
  chapters: Chapter[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  bookId: string
  title: string
  scenes: Scene[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface Scene {
  id: string
  chapterId: string
  title: string
  status: 'DRAFT' | 'EDITING' | 'DONE'
  povCharacterId: string | null
  locationId?: string | null
  wordCount: number
  targetWordCount?: number | null
  body: unknown // TipTap JSON
  notes: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface CodexEntry {
  id: string
  projectId: string
  type: 'character' | 'location' | 'artifact' | 'organization'
  name: string
  attributes: unknown
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type SceneStatus = 'DRAFT' | 'EDITING' | 'DONE'
