import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixBodyStrings() {
  console.log('🔧 Исправление body-строк в сценах...')

  // Получить все сцены где body - строка
  const scenes = await prisma.scene.findMany()

  let fixed = 0
  for (const scene of scenes) {
    const body = scene.body as any
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body)
        await prisma.scene.update({
          where: { id: scene.id },
          data: { body: parsed },
        })
        console.log(`✅ Исправлена сцена: ${scene.title}`)
        fixed++
      } catch (e) {
        console.log(`❌ Ошибка парсинга сцены ${scene.title}: ${e}`)
      }
    }
  }

  console.log(`\n✅ Исправлено сцен: ${fixed}`)

  // Исправить CodexEntry.attributes
  console.log('\n🔧 Исправление attributes в Codex...')
  const entries = await prisma.codexEntry.findMany()
  let fixedAttrs = 0

  for (const entry of entries) {
    const attrs = entry.attributes as any
    if (typeof attrs === 'string') {
      try {
        const parsed = JSON.parse(attrs)
        await prisma.codexEntry.update({
          where: { id: entry.id },
          data: { attributes: parsed },
        })
        console.log(`✅ Исправлена запись: ${entry.name}`)
        fixedAttrs++
      } catch (e) {
        console.log(`❌ Ошибка парсинга ${entry.name}: ${e}`)
      }
    }
  }

  console.log(`✅ Исправлено записей Codex: ${fixedAttrs}`)

  await prisma.$disconnect()
  console.log('\n✅ ГОТОВО!')
}

fixBodyStrings().catch(console.error)
