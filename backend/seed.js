const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create user
  const user = await prisma.user.upsert({
    where: { email: 'default@example.com' },
    update: {},
    create: {
      id: 'default-user',
      email: 'default@example.com',
      name: 'Default User',
    },
  });

  // Create project
  const project = await prisma.project.create({
    data: {
      title: 'Хроники Пустоши',
      ownerId: user.id,
      books: {
        create: {
          title: 'Книга первая. Пепел и снег',
          order: 1,
          chapters: {
            create: [
              {
                title: 'Пролог',
                order: 1,
                scenes: {
                  create: [
                    {
                      title: 'Тишина перед бурей',
                      status: 'DONE',
                      order: 1,
                      wordCount: 150,
                      body: JSON.stringify({
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Над пустошью повисла тишина. Ветер стих, птицы замолкли. Даже облака казались застывшими на месте. Это была та самая тишина перед бурей, которую все старались избежать.',
                              },
                            ],
                          },
                        ],
                      }),
                    },
                    {
                      title: 'Первый снег',
                      status: 'EDITING',
                      order: 2,
                      wordCount: 120,
                      body: JSON.stringify({
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Первая снежинка упала на землю в полдень. Потом вторая. Потом снег пошёл волнами, закрывая всё белым одеялом. Люди спешили домой, но Марк Вейн остался стоять в центре площади.',
                              },
                            ],
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      codexEntries: {
        create: [
          {
            type: 'character',
            name: 'Марк Вейн',
            attributes: JSON.stringify({
              appearance: 'Высокий мужчина с серыми глазами и рубцом на щеке',
              personality: 'Молчаливый, решительный',
              goal_conflict: 'Найти истину о прошлом',
            }),
          },
          {
            type: 'location',
            name: 'Город Ольхов',
            attributes: JSON.stringify({
              description: 'Древний город в центре пустоши, разделённый на две половины большой стеной',
            }),
          },
        ],
      },
    },
    include: {
      books: {
        include: {
          chapters: {
            include: {
              scenes: true,
            },
          },
        },
      },
    },
  });

  console.log('✅ Seed data created successfully!');
  console.log('Project:', project.title);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
