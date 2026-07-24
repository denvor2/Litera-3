import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookiePlugin from '@fastify/cookie'
import { PrismaClient } from '@prisma/client'
import { login, register, createInvitation, verifyToken, getCurrentUser } from '../services/authService.js'

const fastify = Fastify({ logger: false })
const prisma = new PrismaClient()

beforeAll(async () => {
  // Register plugins
  fastify.register(cors, { origin: true, credentials: true })
  fastify.register(cookiePlugin)

  // Auth routes
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    try {
      const { token, user } = await login(email, password)
      reply.setCookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
      return { success: true, user: { id: user.id, email: user.email, name: user.name } }
    } catch (error: any) {
      reply.code(401).send({ error: error.message || 'Invalid credentials' })
    }
  })

  fastify.get('/auth/me', async (request, reply) => {
    try {
      const token = request.cookies.auth_token
      if (!token) {
        reply.code(401).send({ error: 'Not authenticated' })
        return
      }
      const payload = verifyToken(token)
      if (!payload || !payload.userId) {
        reply.code(401).send({ error: 'Invalid token' })
        return
      }
      const user = await getCurrentUser(payload.userId)
      if (!user) {
        reply.code(404).send({ error: 'User not found' })
        return
      }
      return { success: true, user: { id: user.id, email: user.email, name: user.name } }
    } catch (error: any) {
      reply.code(401).send({ error: error.message || 'Authentication failed' })
    }
  })

  await fastify.listen({ port: 3001, host: '127.0.0.1' })
})

afterAll(async () => {
  await fastify.close()
  await prisma.$disconnect()
})

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'den@litstudio.local',
        password: 'Denvor127',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.success).toBe(true)
    expect(body.user.email).toBe('den@litstudio.local')
  })

  it('should reject invalid credentials', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'den@litstudio.local',
        password: 'wrongpassword',
      },
    })

    expect(response.statusCode).toBe(401)
  })


  it('should reject request without token', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/auth/me',
    })

    expect(response.statusCode).toBe(401)
  })
})
