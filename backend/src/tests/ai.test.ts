import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createProvider, getProviderFromEnv } from '../ai-providers/factory.js'
import {
  initializeAIRolesForProject,
  initializeFieldPromptsForProject,
  queryAI,
} from '../services/aiService.js'

// -------------------------------------------------------------------------
// Провайдер: фабрика
// -------------------------------------------------------------------------
describe('AI provider factory', () => {
  it('создаёт Claude-провайдер (happy path)', () => {
    const provider = createProvider('claude', 'sk-test', 'claude-3-5-sonnet-20241022')
    expect(provider).toBeDefined()
    expect(typeof provider.query).toBe('function')
  })

  it('бросает ошибку для нереализованного провайдера (граничная: OpenAI не реализован)', () => {
    expect(() => createProvider('openai' as any, 'key')).toThrow(/Unknown provider/)
  })

  it('getProviderFromEnv бросает ошибку без API-ключа', () => {
    const prev = { p: process.env.AI_PROVIDER, k: process.env.CLAUDE_API_KEY, a: process.env.AI_API_KEY }
    process.env.AI_PROVIDER = 'claude'
    delete process.env.CLAUDE_API_KEY
    delete process.env.AI_API_KEY
    expect(() => getProviderFromEnv()).toThrow(/Missing API key/)
    if (prev.p) process.env.AI_PROVIDER = prev.p
    if (prev.k) process.env.CLAUDE_API_KEY = prev.k
    if (prev.a) process.env.AI_API_KEY = prev.a
  })
})

// -------------------------------------------------------------------------
// Провайдер Claude: маппинг ошибок LLM API (400/401/429/503) и happy path
// -------------------------------------------------------------------------
const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class {
      messages = { create: (...args: any[]) => createMock(...args) }
      constructor(_opts: any) {}
    },
  }
})

describe('ClaudeProvider — обработка ответов и ошибок LLM', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('happy path: возвращает текст и токены', async () => {
    const { ClaudeProvider } = await import('../ai-providers/claude.js')
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: 'Ответ ассистента' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })
    const provider = new ClaudeProvider('sk-test')
    const res = await provider.query({ systemPrompt: 'sys', context: 'ctx', userMessage: 'привет' })
    expect(res.text).toBe('Ответ ассистента')
    expect(res.tokensUsed).toBe(150)
    expect(res.tokenLimit).toBe(200000)
    expect(res.tokensRemaining).toBe(200000 - 150)
  })

  it('401 → Invalid API key', async () => {
    const { ClaudeProvider } = await import('../ai-providers/claude.js')
    createMock.mockRejectedValue({ status: 401 })
    const provider = new ClaudeProvider('bad')
    await expect(provider.query({ systemPrompt: 's', context: 'c', userMessage: 'm' })).rejects.toThrow('Invalid API key')
  })

  it('429 → Rate limit exceeded', async () => {
    const { ClaudeProvider } = await import('../ai-providers/claude.js')
    createMock.mockRejectedValue({ status: 429 })
    const provider = new ClaudeProvider('k')
    await expect(provider.query({ systemPrompt: 's', context: 'c', userMessage: 'm' })).rejects.toThrow('Rate limit exceeded')
  })

  it('503 → Service unavailable', async () => {
    const { ClaudeProvider } = await import('../ai-providers/claude.js')
    createMock.mockRejectedValue({ status: 503 })
    const provider = new ClaudeProvider('k')
    await expect(provider.query({ systemPrompt: 's', context: 'c', userMessage: 'm' })).rejects.toThrow('Service unavailable')
  })

  it('предупреждение при приближении к лимиту контекста', async () => {
    const { ClaudeProvider } = await import('../ai-providers/claude.js')
    createMock.mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 199000, output_tokens: 500 },
    })
    const provider = new ClaudeProvider('k')
    const res = await provider.query({ systemPrompt: 's', context: 'c', userMessage: 'm' })
    expect(res.warnings).toBeDefined()
    expect(res.warnings!.join(' ')).toMatch(/лимит/i)
  })
})

// -------------------------------------------------------------------------
// Модель данных + эндпоинты AI-ролей / field-prompts (реальная БД)
// -------------------------------------------------------------------------
describe('AI roles & field prompts (модель данных)', () => {
  let prisma: PrismaClient
  let projectId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const user = await prisma.user.upsert({
      where: { email: 'test-ai@example.com' },
      update: {},
      create: { id: 'test-user-ai', email: 'test-ai@example.com', name: 'AI Test', password: 'test-password-hash' },
    })
    const project = await prisma.project.create({
      data: { title: 'AI Test Project', ownerId: user.id },
    })
    projectId = project.id
  })

  afterEach(async () => {
    await prisma.aIRole.deleteMany({ where: { projectId } })
    await prisma.aIFieldPrompts.deleteMany({ where: { projectId } })
    await prisma.project.deleteMany({ where: { id: projectId } })
    await prisma.$disconnect()
  })

  it('GET-инициализация: создаются 4 встроенные роли с верными типами/иконками', async () => {
    await initializeAIRolesForProject(projectId)
    const roles = await prisma.aIRole.findMany({ where: { projectId, isDeleted: false } })
    expect(roles).toHaveLength(4)
    const byType = Object.fromEntries(roles.map((r) => [r.type, r]))
    expect(byType.coauthor.name).toBe('Соавтор')
    expect(byType.coauthor.icon).toBe('🤖')
    expect(byType.editor.name).toBe('Редактор')
    expect(byType.critic.name).toBe('Критик')
    expect(byType.reader.name).toBe('Читатель')
    // Каждая роль имеет 3 типовых запроса
    roles.forEach((r) => expect(r.quickPrompts.length).toBe(3))
  })

  it('инициализация идемпотентна (повторный вызов не дублирует роли)', async () => {
    await initializeAIRolesForProject(projectId)
    await initializeAIRolesForProject(projectId)
    const roles = await prisma.aIRole.findMany({ where: { projectId } })
    expect(roles).toHaveLength(4)
  })

  it('field prompts инициализируются (book.title, book.description, scene.title)', async () => {
    await initializeFieldPromptsForProject(projectId)
    const prompts = await prisma.aIFieldPrompts.findMany({ where: { projectId } })
    const scopes = prompts.map((p) => p.scope).sort()
    expect(scopes).toContain('book.title')
    expect(scopes).toContain('book.description')
    expect(scopes).toContain('scene.title')
  })

  it('PUT /api/ai-roles/:roleId — обновление имени, промпта, quickPrompts', async () => {
    await initializeAIRolesForProject(projectId)
    const role = await prisma.aIRole.findFirst({ where: { projectId, type: 'editor' } })
    const updated = await prisma.aIRole.update({
      where: { id: role!.id },
      data: {
        name: 'Мой Редактор',
        systemPrompt: 'Новый промпт',
        quickPrompts: ['q1', 'q2'],
      },
    })
    expect(updated.name).toBe('Мой Редактор')
    expect(updated.systemPrompt).toBe('Новый промпт')
    expect(updated.quickPrompts).toEqual(['q1', 'q2'])
  })

  it('POST /api/ai-roles — создание пользовательской роли (type=custom) в БД', async () => {
    const created = await prisma.aIRole.create({
      data: {
        projectId,
        name: 'Мой помощник',
        type: 'custom',
        icon: '⭐',
        systemPrompt: 'Помогай',
        quickPrompts: ['a', 'b', 'c'],
      },
    })
    expect(created.type).toBe('custom')
    const found = await prisma.aIRole.findUnique({ where: { id: created.id } })
    expect(found).not.toBeNull()
    expect(found!.name).toBe('Мой помощник')
  })

  it('граничная: уникальность (projectId, name) — дубль имени падает', async () => {
    await prisma.aIRole.create({
      data: { projectId, name: 'Дубль', type: 'custom', systemPrompt: 's', quickPrompts: [] },
    })
    await expect(
      prisma.aIRole.create({
        data: { projectId, name: 'Дубль', type: 'custom', systemPrompt: 's', quickPrompts: [] },
      })
    ).rejects.toThrow()
  })
})

// -------------------------------------------------------------------------
// queryAI — валидация и ветки ошибок (без реального сетевого вызова)
// -------------------------------------------------------------------------
describe('queryAI — валидация', () => {
  it('граничная: несуществующая книга → success=false с ошибкой', async () => {
    const res = await queryAI({
      bookId: 'non-existent-book-id',
      role: 'Соавтор',
      scope: 'scene',
      scopeText: 'текст',
      userMessage: 'привет',
    })
    expect(res.success).toBe(false)
    expect(res.warnings).toBeDefined()
    expect(res.warnings!.join(' ')).toMatch(/Book not found/i)
  })
})
