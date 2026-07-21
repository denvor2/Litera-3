export interface User {
  id: string
  email: string
  name: string
}

export interface Project {
  id: string
  title: string
  ownerId: string
  books: Book[]
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  projectId: string
  title: string
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
  wordCount: number
  body: unknown // TipTap JSON
  notes: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface CodexEntry {
  id: string
  projectId: string
  type: 'character' | 'location'
  name: string
  attributes: unknown
  createdAt: string
  updatedAt: string
}

export type SceneStatus = 'DRAFT' | 'EDITING' | 'DONE'
