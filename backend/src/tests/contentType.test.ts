import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookiePlugin from '@fastify/cookie'

const fastify = Fastify({ logger: false })

beforeAll(async () => {
  // Register plugins
  fastify.register(cors, { origin: true, credentials: true })
  fastify.register(cookiePlugin)

  // Set proper Content-Type with UTF-8 charset for JSON responses (but not for files)
  fastify.addHook('onSend', async (request, reply) => {
    const contentType = reply.getHeader('Content-Type')
    if (!contentType || contentType === 'application/json') {
      reply.header('Content-Type', 'application/json; charset=utf-8')
    }
  })

  // JSON endpoint
  fastify.get('/api/test-json', async (request, reply) => {
    return { message: 'тест кириллицы', data: 'Привет мир' }
  })

  // PDF export endpoint (simulated)
  fastify.get('/export/pdf', async (request, reply) => {
    reply.header('Content-Type', 'application/pdf')
    return Buffer.from('%PDF-1.4\n%fake pdf content')
  })

  // FB2 export endpoint (simulated)
  fastify.get('/export/fb2', async (request, reply) => {
    reply.header('Content-Type', 'application/xml')
    return Buffer.from('<?xml version="1.0" encoding="utf-8"?><FictionBook></FictionBook>')
  })

  // DOCX export endpoint (simulated)
  fastify.get('/export/docx', async (request, reply) => {
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return Buffer.from('PK\x03\x04') // DOCX is a ZIP file
  })

  await fastify.listen({ port: 3002, host: '127.0.0.1' })
})

afterAll(async () => {
  await fastify.close()
})

describe('Content-Type headers for API responses and exports', () => {
  it('JSON endpoint должен иметь Content-Type: application/json; charset=utf-8', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/test-json',
    })

    expect(response.statusCode).toBe(200)
    const contentType = response.headers['content-type']
    expect(contentType).toContain('application/json')
    expect(contentType).toContain('charset=utf-8')
  })

  it('PDF export должен иметь Content-Type: application/pdf (не JSON)', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/export/pdf',
    })

    expect(response.statusCode).toBe(200)
    const contentType = response.headers['content-type']
    expect(contentType).toBe('application/pdf')
    expect(contentType).not.toContain('json')
    expect(contentType).not.toContain('charset')
  })

  it('FB2 export должен иметь Content-Type: application/xml (не JSON)', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/export/fb2',
    })

    expect(response.statusCode).toBe(200)
    const contentType = response.headers['content-type']
    expect(contentType).toBe('application/xml')
    expect(contentType).not.toContain('json')
  })

  it('DOCX export должен иметь правильный MIME-type (не JSON)', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/export/docx',
    })

    expect(response.statusCode).toBe(200)
    const contentType = response.headers['content-type']
    expect(contentType).toContain('wordprocessingml')
    expect(contentType).not.toContain('json')
  })

  it('JSON ответ содержит кириллицу в корректной кодировке UTF-8', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/test-json',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    // Проверить что кириллица правильно декодирована
    expect(body.message).toBe('тест кириллицы')
    expect(body.data).toBe('Привет мир')
  })
})
