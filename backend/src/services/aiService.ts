import { PrismaClient } from '@prisma/client';
import { LLMResponse } from '../ai-providers/base.js';
import { getProviderFromEnv } from '../ai-providers/factory.js';

const prisma = new PrismaClient();
const provider = getProviderFromEnv();

export type Scope = 'scene' | 'chapter' | 'dialogue' | 'selection' | 'idea' | 'codex-element' | 'field';

export interface AIQueryRequest {
  bookId: string;
  role: string;
  scope: Scope;
  scopeId?: string;
  scopeLabel?: string;
  scopeText: string;
  userMessage: string;
  customPrompt?: string;
}

export interface AIQueryResponse extends LLMResponse {
  success: boolean;
}

// Fetch AI role and system prompt
async function getAIRole(
  projectId: string,
  roleName: string
): Promise<{ systemPrompt: string; quickPrompts: string[] } | null> {
  const role = await prisma.aIRole.findFirst({
    where: {
      projectId,
      name: roleName,
      isDeleted: false,
    },
  });

  return role
    ? {
        systemPrompt: role.systemPrompt,
        quickPrompts: role.quickPrompts,
      }
    : null;
}

// Build context for a book (or series if book is in a project with multiple books)
async function buildContext(bookId: string): Promise<string> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: {
        include: {
          scenes: {
            where: { deletedAt: null },
          },
        },
      },
      project: {
        include: {
          codexEntries: {
            where: { deletedAt: null },
          },
          notes: {
            where: { deletedAt: null },
          },
          books: {
            where: { deletedAt: null },
            include: {
              chapters: {
                include: {
                  scenes: {
                    where: { deletedAt: null },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!book) {
    throw new Error('Book not found');
  }

  let contextParts: string[] = [];

  // Кодекс
  contextParts.push('=== КОДЕКС ===\n');
  if (book.project.codexEntries.length > 0) {
    contextParts.push('Персонажи и локации:\n');
    for (const entry of book.project.codexEntries) {
      if (entry.type === 'character') {
        contextParts.push(`- ${entry.name} (персонаж): ${JSON.stringify(entry.attributes)}\n`);
      } else if (entry.type === 'location') {
        contextParts.push(`- ${entry.name} (локация): ${JSON.stringify(entry.attributes)}\n`);
      }
    }
  }

  // Идеи (заметки)
  if (book.project.notes.length > 0) {
    contextParts.push('\n=== ИДЕИ ===\n');
    for (const note of book.project.notes) {
      contextParts.push(`- ${note.title}: ${note.content.substring(0, 200)}…\n`);
    }
  }

  // Рукопись
  contextParts.push('\n=== РУКОПИСЬ ===\n');

  // If book is standalone, only include this book; if in series, include all books
  const booksToInclude = book.project.books.length > 1
    ? book.project.books
    : [book];

  for (const b of booksToInclude) {
    contextParts.push(`\n## ${b.title}\n`);

    for (const chapter of b.chapters) {
      contextParts.push(`\n### ${chapter.title}\n`);

      for (const scene of chapter.scenes) {
        contextParts.push(`\n**${scene.title}** (${scene.wordCount} слов)\n`);
        // Extract text from TipTap JSON - simple extraction
        const text = extractTextFromTipTap(scene.body as any);
        contextParts.push(text + '\n');
      }
    }
  }

  return contextParts.join('');
}

// Simple text extraction from TipTap JSON
function extractTextFromTipTap(tiptapJson: any): string {
  if (!tiptapJson || !tiptapJson.content) return '';

  let text = '';
  for (const node of tiptapJson.content) {
    if (node.type === 'paragraph' && node.content) {
      for (const child of node.content) {
        if (child.type === 'text') {
          text += child.text;
        }
      }
      text += '\n';
    } else if (node.type === 'heading' && node.content) {
      for (const child of node.content) {
        if (child.type === 'text') {
          text += child.text;
        }
      }
      text += '\n';
    }
  }
  return text;
}

export async function queryAI(request: AIQueryRequest): Promise<AIQueryResponse> {
  try {
    const book = await prisma.book.findUnique({
      where: { id: request.bookId },
      include: { project: true },
    });

    if (!book) {
      throw new Error('Book not found');
    }

    // Get AI role
    const aiRole = await getAIRole(book.projectId, request.role);
    if (!aiRole) {
      throw new Error(`AI role not found: ${request.role}`);
    }

    // Build context
    const context = await buildContext(request.bookId);

    // Get system prompt (either from role or custom)
    const systemPrompt = request.customPrompt || aiRole.systemPrompt;

    // Query LLM
    const result = await provider.query({
      systemPrompt,
      context,
      userMessage: request.userMessage,
    });

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('AI Query error:', error.message);
    return {
      success: false,
      text: '',
      tokensUsed: 0,
      warnings: [error.message],
    };
  }
}

// Initialize default AI roles for a project
export async function initializeAIRolesForProject(projectId: string): Promise<void> {
  const defaultRoles = [
    {
      name: 'Соавтор',
      type: 'coauthor',
      icon: '🤖',
      systemPrompt: `Ты опытный писатель-соавтор. Помогаешь писателю развивать сцены, дополняя текст в том же стиле и тоне. Когда просят продолжить сцену — пишешь 2–4 абзаца, следуя установленной в Кодексе логике персонажей и локаций. Будь кратким, не перефразируй уже написанное.`,
      quickPrompts: [
        'Продолжи сцену на 3–4 абзаца в этом же тоне',
        'Переформулируй эту часть, чтобы было выразительнее',
        'Что не хватает в этой сцене?',
      ],
    },
    {
      name: 'Редактор',
      type: 'editor',
      icon: '✏️',
      systemPrompt: `Ты опытный редактор. Помогаешь выявлять логические разрывы, неловкие диалоги, излишние детали. Даёшь конкретные рекомендации, как улучшить текст, сохраняя авторский стиль.`,
      quickPrompts: [
        'Найди логические разрывы в этой сцене',
        'Персонажи говорят натурально? Найди неловкие диалоги',
        'Что можно сократить без ущерба?',
      ],
    },
    {
      name: 'Критик',
      type: 'critic',
      icon: '🧐',
      systemPrompt: `Ты внимательный критик. Помогаешь выявлять проблемы в сюжете, характерах, деталях. Указываешь на стереотипы, неубедительность мотивации, структурные проблемы.`,
      quickPrompts: [
        'Что не работает в этой сцене?',
        'Какие стереотипы здесь проявляются?',
        'Насколько эта сцена необходима для сюжета?',
      ],
    },
    {
      name: 'Читатель',
      type: 'reader',
      icon: '👁️',
      systemPrompt: `Ты вымышленный читатель. Эмулируешь читательское восприятие: что понравится, что запутает, где потеряется интерес. Даёшь feedback с точки зрения целевой аудитории.`,
      quickPrompts: [
        'Что я почувствую, читая это впервые?',
        'Где я запутался в сюжете?',
        'Насколько убедительна мотивация персонажа?',
      ],
    },
  ];

  for (const role of defaultRoles) {
    await prisma.aIRole.upsert({
      where: { projectId_name: { projectId, name: role.name } },
      update: {}, // Don't override if exists
      create: {
        projectId,
        name: role.name,
        type: role.type,
        icon: role.icon,
        systemPrompt: role.systemPrompt,
        quickPrompts: role.quickPrompts,
      },
    });
  }
}

// Initialize default field prompts for a project
export async function initializeFieldPromptsForProject(projectId: string): Promise<void> {
  const defaultFieldPrompts = [
    {
      scope: 'book.title',
      scopeLabel: 'Заголовок книги',
      quickPrompts: [
        'Предложи более захватывающий заголовок',
        'Переформулируй для читателя, незнакомого с серией',
        'Проверь на уникальность и избитость',
      ],
    },
    {
      scope: 'book.description',
      scopeLabel: 'Аннотация книги',
      quickPrompts: [
        'Напиши аннотацию, которая привлечёт читателя',
        'Переформулируй короче (1–2 предложения)',
        'Проверь на типичные ошибки и стереотипы',
      ],
    },
    {
      scope: 'scene.title',
      scopeLabel: 'Заголовок сцены',
      quickPrompts: [
        'Предложи заголовок, отражающий суть сцены',
        'Переформулируй как вопрос или загадку',
        'Сделай более интригующим',
      ],
    },
  ];

  for (const prompt of defaultFieldPrompts) {
    await prisma.aIFieldPrompts.upsert({
      where: { projectId_scope: { projectId, scope: prompt.scope } },
      update: {}, // Don't override if exists
      create: {
        projectId,
        scope: prompt.scope,
        scopeLabel: prompt.scopeLabel,
        quickPrompts: prompt.quickPrompts,
      },
    });
  }
}
