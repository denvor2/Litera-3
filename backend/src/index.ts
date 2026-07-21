import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';

const fastify = Fastify({
  logger: true,
});

const prisma = new PrismaClient();

// Register CORS
fastify.register(cors, {
  origin: true,
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Projects routes
fastify.get('/api/projects', async (request, reply) => {
  const projects = await prisma.project.findMany({
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
  return projects;
});

fastify.post('/api/projects', async (request, reply) => {
  const { title, ownerId } = request.body as { title: string; ownerId: string };
  const project = await prisma.project.create({
    data: { title, ownerId },
  });
  return project;
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
