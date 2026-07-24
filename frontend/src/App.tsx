import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Sidebar } from './components/Sidebar'
import { ManuscriptFlow } from './components/ManuscriptFlow'
import { AIPanel, AIMessage, AIRole, AIScope } from './components/AIPanel'
import { AIRoleCard } from './components/AIRoleCard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CodexCard } from './components/CodexCard'
import { BookCard } from './components/BookCard'
import { ProjectCard } from './components/ProjectCard'
import { Guide } from './components/Guide'
import { Login } from './components/Login'
import { AdminPanel } from './components/AdminPanel'
import { extractTextFromTipTap, countCharacters, countAuthorSheets, countPages } from './utils/wordCount'
import { API_BASE } from './config'
import type { Project, Scene, Book, CodexEntry } from './types'

// Жанры литературы
const GENRES = [
  'Фантастика',
  'Фэнтези',
  'Детектив',
  'Романс',
  'Триллер',
  'Драма',
  'Научная фантастика',
  'Исторический роман',
  'Магический реализм',
  'Young Adult',
  'New Adult',
  'Женская проза',
  'Нон-фикшен',
  'Автофикшен',
  'Научно-популярная литература',
]

interface EditingItem {
  type: 'note' | 'book' | 'chapter' | 'scene' | 'codexEntry' | 'project'
  id: string
  parentId?: string // bookId для chapter, chapterId для scene, projectId для codexEntry, projectId для book/note
  data: Record<string, any>
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [allSeries, setAllSeries] = useState<Project[]>([]) // Список всех серий для выпадающего списка
  const [showBooksWithoutSeries, setShowBooksWithoutSeries] = useState(false) // Показать "Книги без серии"
  const [trashRefreshVersion, setTrashRefreshVersion] = useState(0) // Trigger trash reload
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [rightWidth, setRightWidth] = useState(280)
  const [menuOpen, setMenuOpen] = useState(false)

  // AI state
  const [aiRoles, setAIRoles] = useState<AIRole[]>([])
  const [activeAIRole, setActiveAIRole] = useState<AIRole | null>(null)
  const [aiScope, setAIScope] = useState<AIScope>('scene')
  const [aiMessages, setAIMessages] = useState<AIMessage[]>([])
  const [aiLoading, setAILoading] = useState(false)
  const [aiError, setAIError] = useState<string | null>(null)
  const [selectedAIText, setSelectedAIText] = useState<string>('')

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'version-saved'>('saved')
  const [lastVersionTime, setLastVersionTime] = useState<number>(Date.now())
  const [centerView, setCenterView] = useState<'manuscript' | 'codex-card' | 'book-card' | 'project-card' | 'guide' | 'ai-role-edit' | 'ai-role-new'>('manuscript')
  const [selectedCodexEntry, setSelectedCodexEntry] = useState<CodexEntry | null>(null)
  const [selectedBookForCard, setSelectedBookForCard] = useState<Book | null>(null)
  const [guideContent, setGuideContent] = useState<string>('')
  const [selectedAIRole, setSelectedAIRole] = useState<AIRole | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const noteSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data?.user?.id) {
            setIsAuthenticated(true)
            setCurrentUserId(data.user.id)
          } else {
            setIsAuthenticated(false)
            setCurrentUserId(null)
          }
        } else {
          setIsAuthenticated(false)
          setCurrentUserId(null)
        }
      } catch (err) {
        setIsAuthenticated(false)
        setCurrentUserId(null)
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  // Load AI roles when project loads
  useEffect(() => {
    if (project) {
      loadAIRoles(project.id)
    }
  }, [project?.id])

  // Handle text selection in manuscript for AI queries
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().length > 0) {
        const selectedText = selection.toString()
        const range = selection.getRangeAt(0)
        const bodyTextElement = range.commonAncestorContainer.parentElement?.closest('.body-text')

        if (bodyTextElement) {
          // Auto-switch to 'selection' scope and save selected text
          setAIScope('selection')
          setSelectedAIText(selectedText)
        }
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const loadAIRoles = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/ai-roles/${projectId}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to load AI roles')
      let roles: AIRole[] = await response.json()

      // If no roles exist, try loading again (backend will initialize them)
      if (roles.length === 0) {
        const retryResponse = await fetch(`${API_BASE}/api/ai-roles/${projectId}`, {
          credentials: 'include',
        })
        if (retryResponse.ok) {
          roles = await retryResponse.json()
        }
      }

      setAIRoles(roles)
      if (roles.length > 0 && !activeAIRole) {
        setActiveAIRole(roles[0])
      }
    } catch (err) {
      console.error('Failed to load AI roles:', err)
      // Use default roles as fallback
      const defaultRoles: AIRole[] = [
        {
          id: '1',
          name: 'Соавтор',
          type: 'coauthor',
          icon: '🤖',
          quickPrompts: ['Продолжи сцену на 3–4 абзаца', 'Переформулируй выразительнее', 'Что не хватает?']
        },
        {
          id: '2',
          name: 'Редактор',
          type: 'editor',
          icon: '✏️',
          quickPrompts: ['Найди логические разрывы', 'Персонажи говорят натурально?', 'Что сократить?']
        },
        {
          id: '3',
          name: 'Критик',
          type: 'critic',
          icon: '🧐',
          quickPrompts: ['Что не работает?', 'Какие стереотипы?', 'Насколько необходима?']
        },
        {
          id: '4',
          name: 'Читатель',
          type: 'reader',
          icon: '👁️',
          quickPrompts: ['Что я почувствую?', 'Где запутался?', 'Убедительна ли мотивация?']
        },
      ]
      setAIRoles(defaultRoles)
      if (!activeAIRole) {
        setActiveAIRole(defaultRoles[0])
      }
    }
  }

  const handleAISendMessage = async (message: string) => {
    if (!selectedScene || !activeAIRole || !project) return

    // Add user message to history
    const userMessage: AIMessage = { role: 'user', content: message }
    setAIMessages([...aiMessages, userMessage])
    setAILoading(true)
    setAIError(null)

    try {
      // Call backend AI API
      const response = await fetch(`${API_BASE}/api/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookId: selectedBookId || project.books[0]?.id,
          role: activeAIRole.name,
          scope: aiScope,
          sceneId: selectedScene.id,
          scopeText: extractTextFromTipTap(selectedScene.body),
          userMessage: message,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'AI request failed')
      }

      const result = await response.json()

      // Add assistant message
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: result.text,
      }
      setAIMessages(prev => [...prev, assistantMessage])

      if (result.warnings && result.warnings.length > 0) {
        setAIError(result.warnings[0])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setAIError(msg)
      console.error('AI query error:', err)
    } finally {
      setAILoading(false)
    }
  }

  const handleAISendQuickPrompt = async (prompt: string) => {
    await handleAISendMessage(prompt)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    const initProject = async () => {
      try {
        const apiUrl = `${API_BASE}/api/projects`
        const response = await fetch(apiUrl, {
          credentials: 'include',
        })
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
        const text = await response.text()
        if (!text) throw new Error('Empty response')
        const projects = JSON.parse(text)
        // Загрузить все серии для выпадающего списка
        setAllSeries(projects)
        if (projects.length > 0) {
          const proj = projects[0]
          setProject(proj)
          // Auto-select first scene
          if (proj.books?.[0]?.chapters?.[0]?.scenes?.[0]) {
            setSelectedScene(proj.books[0].chapters[0].scenes[0])
          }
        } else {
          throw new Error('No projects found')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        setLoading(false)
      }
    }

    initProject()
  }, [isAuthenticated])

  const handleSceneSelect = (scene: Scene) => {
    setSelectedScene(scene)
    // Show manuscript view
    setCenterView('manuscript')
  }

  const handleBookSelect = (bookId: string) => {
    setSelectedBookId(bookId)
    // Deselect scene when switching books
    setSelectedScene(null)
    // Show manuscript view
    setCenterView('manuscript')
  }

  const handleSceneSave = async (updatedScene: Scene) => {
    if (!project) return
    try {
      setSaveStatus('saving')
      const response = await fetch(`${API_BASE}/api/scenes/${updatedScene.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedScene),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      setSelectedScene(updatedScene)
      // Update in project tree
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter => ({
            ...chapter,
            scenes: chapter.scenes.map(scene =>
              scene.id === updatedScene.id ? updatedScene : scene
            ),
          })),
        })),
      })

      // Check if version was likely created (10+ minutes since last version)
      const timeSinceLastVersion = Date.now() - lastVersionTime
      if (timeSinceLastVersion > 10 * 60 * 1000) {
        setSaveStatus('version-saved')
        setLastVersionTime(Date.now())
        // Show "version saved" indicator for 2 seconds
        setTimeout(() => setSaveStatus('saved'), 2000)
      } else {
        setSaveStatus('saved')
      }
    } catch (error) {
      console.error('Failed to save scene:', error)
      setSaveStatus('error')
    }
  }

  const handleCreateScene = (chapterId: string) => {
    if (!project) return
    // Открыть форму для создания новой сцены (не автосоздание)
    setEditingItem({
      type: 'scene',
      id: 'new',
      parentId: chapterId,
      data: {
        chapterId,
        title: '',
        status: 'DRAFT',
        targetWordCount: null,
      },
    })
  }


  const handleUpdateSceneOrder = async (sceneId: string, newChapterId: string, newOrder: number) => {
    if (!project) return
    try {
      await fetch(`${API_BASE}/api/scenes/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          updates: [{ id: sceneId, chapterId: newChapterId, order: newOrder }],
        }),
      })

      let movedScene: Scene | null = null
      const newProject = {
        ...project,
        books: project.books
          .map(book => ({
            ...book,
            chapters: book.chapters.map(chapter => ({
              ...chapter,
              scenes: chapter.scenes.filter(scene => {
                if (scene.id === sceneId) {
                  movedScene = { ...scene, chapterId: newChapterId, order: newOrder }
                  return false
                }
                return true
              }),
            })),
          }))
          .map(book => ({
            ...book,
            chapters: book.chapters.map(chapter =>
              chapter.id === newChapterId && movedScene
                ? { ...chapter, scenes: [...chapter.scenes, movedScene] }
                : chapter
            ),
          })),
      }
      setProject(newProject)
    } catch (error) {
      console.error('Failed to update scene order:', error)
    }
  }

  const handleCreateBook = () => {
    if (!project) return
    // Открыть форму для создания новой книги (не автосоздание)
    setEditingItem({
      type: 'book',
      id: 'new',
      parentId: project.id,
      data: {
        projectId: project.id,
        title: '',
        series: '',
        genre: '',
        description: '',
        synopsis: '',
        isInSeries: !showBooksWithoutSeries, // true если серия, false если "Книги без серии"
      },
    })
  }

  const handleCreateChapter = (bookId: string) => {
    if (!project) return
    // Открыть форму для создания новой главы (не автосоздание)
    const book = project.books.find(b => b.id === bookId)
    if (!book) return

    setEditingItem({
      type: 'chapter',
      id: 'new',
      parentId: bookId,
      data: {
        bookId,
        title: '',
      },
    })
  }

  const handleEdit = (type: 'chapter' | 'scene' | 'codexEntry' | 'book', id: string, parentId: string | undefined, data: Record<string, any>) => {
    setEditingItem({ type, id, parentId, data: { ...data } })
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !project) return
    try {
      const { type, id, data, parentId } = editingItem
      let endpoint: string
      let method: 'POST' | 'PUT' = 'PUT'

      if (type === 'project' && id === 'new') {
        endpoint = '/api/projects'
        method = 'POST'
      } else if (type === 'project') {
        endpoint = `/api/projects/${id}`
      } else if (type === 'book' && id === 'new') {
        endpoint = '/api/books'
        method = 'POST'
      } else if (type === 'book') {
        endpoint = `/api/books/${id}`
      } else if (type === 'chapter' && id === 'new') {
        endpoint = '/api/chapters'
        method = 'POST'
      } else if (type === 'chapter') {
        endpoint = `/api/chapters/${id}`
      } else if (type === 'scene' && id === 'new') {
        endpoint = '/api/scenes'
        method = 'POST'
      } else if (type === 'scene') {
        endpoint = `/api/scenes/${id}`
      } else if (type === 'note' && id === 'new') {
        endpoint = '/api/notes'
        method = 'POST'
        // Add projectId for new notes
        dataToSend.projectId = project.id
      } else if (type === 'note') {
        endpoint = `/api/notes/${id}`
      } else if (type === 'codexEntry') {
        endpoint = `/api/codex/${id}`
      } else {
        return
      }

      // Remove type from data before sending (it's UI-only)
      const { type: _, ...dataToSend } = data

      // Convert status to uppercase for enum validation (DB expects DRAFT/EDITING/DONE)
      if (dataToSend.status) {
        dataToSend.status = dataToSend.status.toUpperCase()
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const updated = await response.json()

      if (type === 'project' && id === 'new') {
        // After creating project, update to the newly created project
        setProject(updated)
        setAllSeries([...allSeries, updated])
      } else if (type === 'project') {
        // Update existing project
        setProject(updated)
        setAllSeries(allSeries.map(p => (p.id === id ? updated : p)))
      } else if (type === 'book' && id === 'new') {
        // After creating book, add to project
        setProject({
          ...project,
          books: [...project.books, updated],
        })
      } else if (type === 'book') {
        // Update existing book
        setProject({
          ...project,
          books: project.books.map(b => (b.id === id ? updated : b)),
        })
      } else if (type === 'chapter' && id === 'new') {
        // After creating chapter, add to book
        setProject({
          ...project,
          books: project.books.map(b =>
            b.id === parentId ? { ...b, chapters: [...b.chapters, updated] } : b
          ),
        })
      } else if (type === 'chapter') {
        setProject({
          ...project,
          books: project.books.map(b =>
            b.chapters?.find(c => c.id === id)
              ? { ...b, chapters: b.chapters.map(c => (c.id === id ? updated : c)) }
              : b
          ),
        })
      } else if (type === 'scene' && id === 'new') {
        // After creating scene, add to chapter
        setProject({
          ...project,
          books: project.books.map(book => ({
            ...book,
            chapters: book.chapters.map(c =>
              c.id === parentId ? { ...c, scenes: [...c.scenes, updated] } : c
            ),
          })),
        })
        setSelectedScene(updated)
      } else if (type === 'scene') {
        const updatedBooks = project.books.map(b => ({
          ...b,
          chapters: b.chapters.map(c =>
            c.scenes?.find(s => s.id === id)
              ? { ...c, scenes: c.scenes.map(s => (s.id === id ? updated : s)) }
              : c
          ),
        }))
        setProject({ ...project, books: updatedBooks })
        if (selectedScene?.id === id) setSelectedScene(updated)
      } else if (type === 'note' && id === 'new') {
        // After creating note, add to project
        setProject({
          ...project,
          notes: [...(project.notes || []), updated],
        })
      } else if (type === 'note') {
        // Update existing note
        setProject({
          ...project,
          notes: project.notes?.map(n => (n.id === id ? updated : n)) || [],
        })
      } else if (type === 'codexEntry') {
        setProject({
          ...project,
          codexEntries: project.codexEntries?.map(e => (e.id === id ? updated : e)) || [],
        })
      }
      setEditingItem(null)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const handleNotesChange = async (notes: string) => {
    if (!selectedScene) return
    // Дебаунс 2 сек
    if (noteSaveTimeoutRef.current) clearTimeout(noteSaveTimeoutRef.current)
    noteSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/scenes/${selectedScene.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ notes }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const updated = await response.json()
        setSelectedScene(updated)
      } catch (error) {
        console.error('Failed to save notes:', error)
      }
    }, 2000)
  }

  const handleDeleteScene = async (sceneId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/scenes/${sceneId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      // Update project state
      if (selectedScene?.id === sceneId) {
        setSelectedScene(null)
      }
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.map(chapter => ({
            ...chapter,
            scenes: chapter.scenes.filter(scene => scene.id !== sceneId),
          })),
        })),
      })
      setTrashRefreshVersion(v => v + 1)
    } catch (error) {
      console.error('Failed to delete scene:', error)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/chapters/${chapterId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject({
        ...project,
        books: project.books.map(book => ({
          ...book,
          chapters: book.chapters.filter(chapter => chapter.id !== chapterId),
        })),
      })
      setTrashRefreshVersion(v => v + 1)
    } catch (error) {
      console.error('Failed to delete chapter:', error)
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/books/${bookId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      // Update project if in series mode
      if (project) {
        setProject({
          ...project,
          books: project.books.filter(book => book.id !== bookId),
        })
      }
      // In "Книги без серии" mode, update allSeries
      if (showBooksWithoutSeries) {
        setAllSeries(allSeries.map(series => ({
          ...series,
          books: series.books.filter(book => book.id !== bookId),
        })))
      }
      setTrashRefreshVersion(v => v + 1)
    } catch (error) {
      console.error('Failed to delete book:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject({
        ...project,
        notes: (project.notes || []).filter(note => note.id !== noteId),
      })
      setTrashRefreshVersion(v => v + 1)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleCreateCodexEntry = async (type: 'character' | 'location') => {
    if (!project) return
    const name = type === 'character' ? `Персонаж ${Math.random().toString(36).substr(2, 5)}` : `Локация ${Math.random().toString(36).substr(2, 5)}`
    try {
      const response = await fetch(`${API_BASE}/api/codex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: project.id,
          type,
          name,
          attributes: type === 'character'
            ? { appearance: '', personality: '', goal_conflict: '' }
            : { description: '' },
        }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      const newEntry = await response.json()
      setProject({
        ...project,
        codexEntries: [...(project.codexEntries || []), newEntry],
      })
    } catch (error) {
      console.error(`Failed to create ${type}:`, error)
    }
  }

  const handleCreateProject = () => {
    if (!currentUserId) {
      console.error('User not authenticated')
      return
    }
    setEditingItem({ type: 'project', id: 'new', data: { title: '', synopsis: '', ownerId: currentUserId } })
  }

  const handleSaveCodexEntry = async (entry: CodexEntry) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/codex/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(entry),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject({
        ...project,
        codexEntries: project.codexEntries?.map(e => (e.id === entry.id ? entry : e)) || [],
      })
    } catch (error) {
      console.error('Failed to save codex entry:', error)
    }
  }

  const handleSaveBook = async (book: Book) => {
    if (!project) return
    try {
      const response = await fetch(`${API_BASE}/api/books/${book.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(book),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject({
        ...project,
        books: project.books.map(b => (b.id === book.id ? book : b)),
      })
    } catch (error) {
      console.error('Failed to save book:', error)
    }
  }

  const handleSaveProject = async (proj: Project) => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${proj.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(proj),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setProject(proj)
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  const handleBackToManuscript = () => {
    setCenterView('manuscript')
  }

  const handleExport = async (format: 'docx' | 'fb2' | 'pdf') => {
    if (!currentBook) return
    try {
      const url = format === 'docx'
        ? `${API_BASE}/api/books/${currentBook.id}/export`
        : `${API_BASE}/api/books/${currentBook.id}/export?format=${format}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Ошибка экспорта: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${currentBook.title}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleCodexCardClick = (entry: CodexEntry) => {
    setSelectedCodexEntry(entry)
    setCenterView('codex-card')
  }

  const handleBookCardClick = (book: Book) => {
    setSelectedBookForCard(book)
    setCenterView('book-card')
  }

  const handleShowGuideClick = (content: string) => {
    setGuideContent(content)
    setCenterView('guide')
  }

  const handleProjectCardClick = () => {
    setCenterView('project-card')
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      setIsAuthenticated(false)
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (authLoading) return <div className="app-loading">Загрузка...</div>

  // Если не авторизован - показать иконку входа и пустую страницу
  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="topbar">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
            <button
              className="topbar-btn"
              onClick={() => setShowLoginModal(true)}
              title="Вход"
            >
              🔑
            </button>
          </div>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-2)' }}>
          <h2>Добро пожаловать в LitStudio</h2>
          <p>Нажми иконку 🔑 чтобы войти</p>
        </div>
        {showLoginModal && (
          <Login
            onLoginSuccess={() => window.location.reload()}
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </div>
    )
  }

  if (loading) return <div className="app-loading">Загрузка...</div>
  if (error) return <div className="app-error"><h2>Ошибка</h2><p>{error}</p></div>

  const sceneBody = selectedScene?.body
  const sceneText = selectedScene && sceneBody ? extractTextFromTipTap(sceneBody) : ''
  // Пересчитываем статистику из текста в реальном времени
  const wordCount = sceneText.split(/\s+/).filter(w => w.length > 0).length
  const charCount = countCharacters(sceneText, true)
  const authorSheets = countAuthorSheets(charCount).toFixed(2)
  const pages = countPages(charCount).toFixed(0)

  const currentBook = project?.books.find(b => b.id === selectedBookId) || project?.books[0]

  return (
    <div className={`app ${zenMode ? 'zen-mode' : ''}`}>
      {/* TopBar */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Меню"
          >
            ☰
          </button>
          {menuOpen && (
            <div className="hmenu" ref={menuRef}>
              <div
                className="hmenu-item"
                onClick={() => {
                  setEditingItem({ type: 'project', id: 'new', data: { title: '' } })
                  setMenuOpen(false)
                }}
                title="Создать новую серию"
              >
                ✨ Создать серию
              </div>
              <div className="hmenu-sep"></div>
              <div
                className="hmenu-item"
                onClick={() => {
                  if (project?.codexEntries?.[0]) {
                    handleCodexCardClick(project.codexEntries[0])
                  }
                  setMenuOpen(false)
                }}
                title="Показать первую карточку Кодекса"
              >
                📖 Кодекс
              </div>
              <div className="hmenu-sep"></div>
              <div
                className="hmenu-item"
                onClick={() => {
                  if (currentBook) {
                    handleBookCardClick(currentBook)
                  }
                  setMenuOpen(false)
                }}
                title="Показать карточку текущей книги"
              >
                📕 Книга
              </div>
              <div className="hmenu-sep"></div>
              <div
                className="hmenu-item"
                onClick={() => {
                  if (project) {
                    handleProjectCardClick()
                  }
                  setMenuOpen(false)
                }}
                title="Показать карточку проекта"
              >
                📋 Проект
              </div>
              <div className="hmenu-sep"></div>
              <div
                className="hmenu-item"
                onClick={() => {
                  handleShowGuideClick('# Справка\n\nДобро пожаловать в LitStudio 2!')
                  setMenuOpen(false)
                }}
                title="Показать справку"
              >
                ❓ Справка
              </div>
              <div className="hmenu-sep"></div>
              <div
                className="hmenu-item"
                onClick={() => {
                  handleExport('docx')
                  setMenuOpen(false)
                }}
              >
                📄 Экспорт (Word)
              </div>
              <div
                className="hmenu-item"
                onClick={() => {
                  handleExport('fb2')
                  setMenuOpen(false)
                }}
              >
                📖 Экспорт (FictionBook)
              </div>
              <div
                className="hmenu-item"
                onClick={() => {
                  handleExport('pdf')
                  setMenuOpen(false)
                }}
              >
                📕 Экспорт (PDF)
              </div>
              <div className="hmenu-sep"></div>
              <div className="hmenu-item">📥 Импорт</div>
              <div className="hmenu-sep"></div>
              <div className="hmenu-item">📚 История версий</div>
              <div className="hmenu-sep"></div>
              <div className="hmenu-item">⚙️ Настройки</div>
            </div>
          )}
          <h1 className="topbar-title">LitStudio 2</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="topbar-btn"
            onClick={() => setZenMode(!zenMode)}
            title={zenMode ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          >
            {zenMode ? '⊟' : '⊞'}
          </button>
          {isAuthenticated ? (
            <>
              <button
                className="topbar-btn"
                onClick={() => setShowAdminPanel(true)}
                title="Админ-панель"
              >
                ⚙️
              </button>
              <button
                className="topbar-btn"
                onClick={handleLogout}
                title="Выход"
              >
                🚪
              </button>
            </>
          ) : (
            <button
              className="topbar-btn"
              onClick={() => setShowLoginModal(true)}
              title="Вход"
            >
              🔑
            </button>
          )}
        </div>
      </div>

      {/* Workspace */}
      <div className="workspace" style={{ '--right-w': `${rightWidth}px` } as any}>
        {/* Sidebar */}
        {!zenMode && (
          <ErrorBoundary>
            <Sidebar
              project={project || undefined}
              books={showBooksWithoutSeries
                ? allSeries.flatMap(s => s.books).filter(b => b.isInSeries === false)
                : project?.books.filter(b => b.isInSeries !== false) || []
              }
              allSeries={allSeries}
              trashProjectId={project?.id || (showBooksWithoutSeries && allSeries.length > 0 ? allSeries[0].id : allSeries[0]?.id)}
              trashRefreshVersion={trashRefreshVersion}
              selectedSceneId={selectedScene?.id}
              selectedBookId={selectedBookId || undefined}
              selectedScene={selectedScene || undefined}
              onSceneSelect={handleSceneSelect}
              onBookSelect={handleBookSelect}
              onSelectProject={(projectId) => {
                if (projectId === 'no-series') {
                  // Show books without series
                  setProject(null)
                  setShowBooksWithoutSeries(true)
                  setSelectedScene(null)
                  setSelectedBookId(null)
                } else {
                  const selectedProj = allSeries.find(p => p.id === projectId)
                  if (selectedProj) {
                    setProject(selectedProj)
                    setShowBooksWithoutSeries(false)
                    setSelectedScene(null)
                    setSelectedBookId(null)
                  }
                }
              }}
              onDeleteProject={(projectId) => {
                const handleDelete = async () => {
                  try {
                    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
                      method: 'DELETE',
                      credentials: 'include',
                    })
                    if (!response.ok) throw new Error('Failed to delete project')
                    // Remove from allSeries
                    const updated = allSeries.filter(p => p.id !== projectId)
                    setAllSeries(updated)
                    // Switch to another project if we deleted the current one
                    if (project?.id === projectId) {
                      if (updated.length > 0) {
                        setProject(updated[0])
                      } else {
                        setProject(null)
                        setShowBooksWithoutSeries(false)
                      }
                      setSelectedScene(null)
                      setSelectedBookId(null)
                    }
                    setTrashRefreshVersion(v => v + 1)
                  } catch (error) {
                    console.error('Failed to delete project:', error)
                  }
                }
                handleDelete()
              }}
              onEditProject={(proj) => {
                setEditingItem({ type: 'project', id: proj.id, data: { title: proj.title, synopsis: proj.synopsis || '' } })
              }}
              onCreateScene={handleCreateScene}
              onUpdateSceneOrder={handleUpdateSceneOrder}
              onCreateBook={handleCreateBook}
              onCreateChapter={handleCreateChapter}
              onDeleteBook={handleDeleteBook}
              onDeleteChapter={handleDeleteChapter}
              onDeleteScene={handleDeleteScene}
              onCreateCodexEntry={handleCreateCodexEntry}
              onCreateProject={handleCreateProject}
              onEditChapter={(chapterId, bookId, title) => handleEdit('chapter', chapterId, bookId, { title })}
              onEditScene={(sceneId, chapterId, data) => handleEdit('scene', sceneId, chapterId, data)}
              onEditCodexEntry={(entryId, data) => handleEdit('codexEntry', entryId, undefined, data)}
              onEditBook={(bookId) => {
                if (!project) return
                const book = project.books.find(b => b.id === bookId)
                if (book) handleEdit('book', bookId, project.id, { title: book.title, genre: book.genre, synopsis: book.synopsis, description: book.description, plannedCharCount: book.plannedCharCount, plannedAuthorSheets: book.plannedAuthorSheets, isInSeries: book.isInSeries })
              }}
              onCreateNote={() => setEditingItem({ type: 'note', id: 'new', data: { title: '', content: '' } })}
              onEditNote={(noteId, data) => setEditingItem({ type: 'note', id: noteId, data })}
              onDeleteNote={(noteId) => handleDeleteNote(noteId)}
              onNotesChange={handleNotesChange}
            />
          </ErrorBoundary>
        )}

        {/* Center */}
        <div className="center">
          {centerView === 'codex-card' && selectedCodexEntry ? (
            <CodexCard
              entry={selectedCodexEntry}
              onSave={handleSaveCodexEntry}
              onBack={handleBackToManuscript}
              onSceneClick={(sceneId) => {
                const scene = project?.books
                  .flatMap(b => b.chapters)
                  .flatMap(c => c.scenes)
                  .find(s => s.id === sceneId)
                if (scene) {
                  setSelectedScene(scene)
                  setCenterView('manuscript')
                }
              }}
            />
          ) : centerView === 'book-card' && selectedBookForCard ? (
            <BookCard
              book={selectedBookForCard}
              onSave={handleSaveBook}
              onBack={handleBackToManuscript}
            />
          ) : centerView === 'project-card' ? (
            <ProjectCard
              project={project as Project}
              onSave={handleSaveProject}
              onBack={handleBackToManuscript}
            />
          ) : centerView === 'guide' ? (
            <Guide
              content={guideContent}
              onBack={handleBackToManuscript}
              title="Справка"
            />
          ) : centerView === 'ai-role-edit' && selectedAIRole && project ? (
            <AIRoleCard
              role={selectedAIRole}
              projectId={project.id}
              onClose={handleBackToManuscript}
              onSave={(updatedRole) => {
                setAIRoles(aiRoles.map(r => r.id === updatedRole.id ? updatedRole : r))
                if (activeAIRole?.id === updatedRole.id) {
                  setActiveAIRole(updatedRole)
                }
                handleBackToManuscript()
              }}
            />
          ) : centerView === 'ai-role-new' && selectedAIRole && project ? (
            <AIRoleCard
              role={selectedAIRole}
              projectId={project.id}
              onClose={handleBackToManuscript}
              onSave={(newRole) => {
                setAIRoles([...aiRoles, newRole])
                handleBackToManuscript()
              }}
            />
          ) : editingItem ? (
            <div className="center-card">
              <div className="center-back">
                <button
                  className="back-link"
                  onClick={() => setEditingItem(null)}
                  title="Назад"
                >
                  ← Назад
                </button>
              </div>
              <div className="head">
                {editingItem.type === 'chapter' ? (
                  <h2>{editingItem.id === 'new' ? 'Создать главу' : 'Редактировать главу'}</h2>
                ) : editingItem.type === 'scene' ? (
                  <h2>{editingItem.id === 'new' ? 'Создать сцену' : 'Редактировать сцену'}</h2>
                ) : editingItem.type === 'book' ? (
                  <h2>{editingItem.id === 'new' ? 'Создать книгу' : 'Редактировать книгу'}</h2>
                ) : editingItem.type === 'note' ? (
                  <h2>{editingItem.id === 'new' ? 'Создать заметку' : 'Редактировать заметку'}</h2>
                ) : editingItem.type === 'project' ? (
                  <h2>{editingItem.id === 'new' ? 'Создать серию' : 'Редактировать серию'}</h2>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="avatar-lg">
                      {editingItem.data.name?.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join('')}
                    </div>
                    <div>
                      <h2>{editingItem.data.name}</h2>
                      <div className="subtitle">
                        {editingItem.data.type === 'character' ? 'персонаж' : 'локация'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {editingItem.type === 'chapter' && (
                <div className="field">
                  <label>Название</label>
                  <input
                    type="text"
                    value={editingItem.data.title}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                    className="bc-input"
                    placeholder="Название главы"
                  />
                </div>
              )}

              {editingItem.type === 'scene' && (
                <>
                  <div className="field">
                    <label>Название</label>
                    <input
                      type="text"
                      value={editingItem.data.title}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                      className="bc-input"
                      placeholder="Название сцены"
                    />
                  </div>
                  <div className="field">
                    <label>Статус</label>
                    <select
                      value={editingItem.data.status || 'draft'}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, status: e.target.value } })}
                      className="bc-select"
                    >
                      <option value="draft">Черновик</option>
                      <option value="editing">Редактирование</option>
                      <option value="done">Готово</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Целевой объём (слова)</label>
                    <input
                      type="number"
                      value={editingItem.data.targetWordCount || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, targetWordCount: e.target.value ? parseInt(e.target.value) : null } })}
                      className="bc-input"
                      placeholder="Целевой объём в словах"
                      min="0"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'book' && (
                <>
                  <div className="field">
                    <label>Название</label>
                    <input
                      type="text"
                      value={editingItem.data.title}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                      className="bc-input"
                      placeholder="Название книги"
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={editingItem.data.isInSeries !== false}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, isInSeries: e.target.checked } })}
                      />
                      Это книга в серии
                    </label>
                  </div>
                  <div className="field">
                    <label>Жанр</label>
                    <select
                      value={editingItem.data.genre || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, genre: e.target.value } })}
                      className="bc-select"
                    >
                      <option value="">Выберите жанр</option>
                      {GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Синопсис</label>
                    <textarea
                      value={editingItem.data.synopsis || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, synopsis: e.target.value } })}
                      className="bc-textarea"
                      placeholder="Краткое описание сюжета"
                      rows={4}
                    />
                  </div>
                  <div className="field">
                    <label>Описание</label>
                    <textarea
                      value={editingItem.data.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                      className="bc-textarea"
                      placeholder="Полное описание для читателя"
                      rows={4}
                    />
                  </div>
                  <div className="field">
                    <label>Плановый объём (символы)</label>
                    <input
                      type="number"
                      value={editingItem.data.plannedCharCount || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, plannedCharCount: e.target.value ? parseInt(e.target.value) : null } })}
                      className="bc-input"
                      placeholder="Например: 120000"
                      min="0"
                    />
                  </div>
                  <div className="field">
                    <label>Плановый объём (авт. листы)</label>
                    <input
                      type="number"
                      value={editingItem.data.plannedAuthorSheets || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, plannedAuthorSheets: e.target.value ? parseInt(e.target.value) : null } })}
                      className="bc-input"
                      placeholder="Например: 3 (= 120000 знаков)"
                      min="0"
                      step="0.25"
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'project' && (
                <>
                  <div className="field">
                    <label>Название серии</label>
                    <input
                      type="text"
                      value={editingItem.data.title}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                      className="bc-input"
                      placeholder="Название новой серии"
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label>Синапсис серии</label>
                    <textarea
                      value={editingItem.data.synopsis || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, synopsis: e.target.value } })}
                      className="bc-textarea"
                      placeholder={'СТРУКТУРА СЕРИИ:\nЦикл из трёх романов об Элене, картографе\n\nМИР И СЕТТИНГ:\nМир 1: средневековая фантазия с магией природы\nМир 2: стимпанк-ретрофьючер с альтернативной историей\nМир 3: пост-апокалиптический мир без магии\n\nГЛАВНЫЕ ПЕРСОНАЖИ:\n- Элена: картограф, открывает портал между мирами\n- Каян: магический воин из Мира 1\n- Вивиан: технолог из Мира 2\n\nГЛАВНЫЙ КОНФЛИКТ:\nСтолкновение между сохранением магии и технологическим прогрессом\n\nТОН И АТМОСФЕРА:\nЭпический, приключенческий, с элементами mystery и романтики'}
                      rows={14}
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'note' && (
                <>
                  <div className="field">
                    <label>Название</label>
                    <input
                      type="text"
                      value={editingItem.data.title}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                      className="bc-input"
                      placeholder="Название заметки"
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label>Содержание</label>
                    <textarea
                      value={editingItem.data.content || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, content: e.target.value } })}
                      className="bc-textarea"
                      placeholder="Текст заметки"
                      rows={10}
                    />
                  </div>
                </>
              )}

              {editingItem.type === 'codexEntry' && (
                <>
                  <div className="field">
                    <label>Название</label>
                    <input
                      type="text"
                      value={editingItem.data.name}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                      className="bc-input"
                      placeholder="Название записи"
                    />
                  </div>
                  {editingItem.data.type === 'character' ? (
                    <>
                      <div className="field">
                        <label>Внешность</label>
                        <textarea
                          value={editingItem.data.attributes?.appearance || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            data: {
                              ...editingItem.data,
                              attributes: { ...editingItem.data.attributes, appearance: e.target.value }
                            }
                          })}
                          className="bc-textarea"
                          placeholder="Описание внешности"
                          rows={4}
                        />
                      </div>
                      <div className="field">
                        <label>Характер</label>
                        <textarea
                          value={editingItem.data.attributes?.personality || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            data: {
                              ...editingItem.data,
                              attributes: { ...editingItem.data.attributes, personality: e.target.value }
                            }
                          })}
                          className="bc-textarea"
                          placeholder="Черты характера и поведение"
                          rows={4}
                        />
                      </div>
                      <div className="field">
                        <label>Цель / конфликт</label>
                        <textarea
                          value={editingItem.data.attributes?.goal_conflict || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            data: {
                              ...editingItem.data,
                              attributes: { ...editingItem.data.attributes, goal_conflict: e.target.value }
                            }
                          })}
                          className="bc-textarea"
                          placeholder="Цель персонажа и основной конфликт"
                          rows={4}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="field">
                      <label>Описание</label>
                      <textarea
                        value={editingItem.data.attributes?.description || ''}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: {
                            ...editingItem.data,
                            attributes: { ...editingItem.data.attributes, description: e.target.value }
                          }
                        })}
                        className="bc-textarea"
                        placeholder="Описание локации"
                        rows={6}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="bc-actions">
                <button className="bc-btn" onClick={() => setEditingItem(null)}>Отмена</button>
                <button className="bc-btn primary" onClick={handleSaveEdit}>Сохранить</button>
              </div>
            </div>
          ) : (centerView === 'manuscript' && currentBook) ? (
            <ManuscriptFlow
              book={currentBook}
              selectedScene={selectedScene}
              onSelectScene={handleSceneSelect}
              onStatusChange={(sceneId, newStatus) => {
                const scene = currentBook.chapters
                  .flatMap(c => c.scenes)
                  .find(s => s.id === sceneId)
                if (scene) {
                  handleSceneSave({ ...scene, status: newStatus as any })
                }
              }}
              onSaveScene={handleSceneSave}
              onEditScene={() => {}}
              onMentionClick={() => {}}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-muted)' }}>
              Выберите сцену для редактирования
            </div>
          )}
        </div>

        {/* Right Panel */}
        {!zenMode && (
          <>
            <div className="right-panel">
              <div
                className="resize-handle"
                onMouseDown={(e) => {
                  const startX = e.clientX
                  const startWidth = rightWidth
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const delta = moveEvent.clientX - startX
                    const newWidth = Math.max(200, Math.min(460, startWidth - delta))
                    setRightWidth(newWidth)
                  }
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              />
              <AIPanel
                activeRole={activeAIRole}
                aiRoles={aiRoles}
                onSelectRole={setActiveAIRole}
                onOpenRoleSettings={(role) => {
                  setSelectedAIRole(role)
                  setCenterView('ai-role-edit')
                }}
                scope={aiScope}
                onScopeChange={setAIScope}
                messages={aiMessages}
                onSendMessage={handleAISendMessage}
                onSendQuickPrompt={handleAISendQuickPrompt}
                selectedText={selectedAIText}
                contextInfo={project ? `текст этой книги + Кодекс серии + синопсисы других книг «${project.title}»` : 'контекст'}
                isLoading={aiLoading}
                error={aiError || undefined}
                onAddCustomRole={() => {
                  const newRole: AIRole = {
                    id: 'new-' + Date.now(),
                    name: 'Новая роль',
                    type: 'custom',
                    icon: '🤖',
                    quickPrompts: [],
                  }
                  setSelectedAIRole(newRole)
                  setCenterView('ai-role-new')
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* BottomBar */}
      <div className="bottombar">
        <div className="stats-group">
          <span title="Количество слов">{wordCount} слов</span>
          <span title="Символы с пробелами">{charCount} знаков</span>
          <span title="Авторские листы (1 а.л. = 40 000 знаков)">{authorSheets} а.л.</span>
          <span title="Страницы (1 стр. = 1800 знаков)">{pages} стр.</span>
        </div>

        {/* Progress bar */}
        {selectedScene && selectedScene.targetWordCount && (
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, (wordCount / selectedScene.targetWordCount) * 100)}%`,
                  backgroundColor: wordCount >= selectedScene.targetWordCount ? 'var(--done)' : 'var(--accent)'
                }}
              />
            </div>
            <span className="progress-text">
              {wordCount} / {selectedScene.targetWordCount} слов
            </span>
          </div>
        )}

        <div className="save-state">
          <span
            className="save-dot"
            style={{
              backgroundColor:
                saveStatus === 'version-saved' ? 'var(--accent)' :
                saveStatus === 'saved' ? 'var(--done)' :
                saveStatus === 'saving' ? 'var(--editing)' :
                'var(--error)'
            }}
            title={saveStatus}
          />
          <span>
            {saveStatus === 'version-saved' ? 'Версия сохранена' :
             saveStatus === 'saved' ? 'Сохранено' :
             saveStatus === 'saving' ? 'Сохраняется...' :
             'Ошибка сохранения'}
          </span>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <Login
          onLoginSuccess={() => {
            setIsAuthenticated(true)
            setShowLoginModal(false)
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel
          onClose={() => setShowAdminPanel(false)}
          onLogout={() => {
            setShowAdminPanel(false)
            handleLogout()
          }}
        />
      )}
    </div>
  )
}

export default App
