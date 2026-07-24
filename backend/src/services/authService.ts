import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

export interface AuthPayload {
  userId: string
  email: string
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.password) {
    throw new Error('Invalid email or password')
  }

  const passwordMatch = await bcrypt.compare(password, user.password)
  if (!passwordMatch) {
    throw new Error('Invalid email or password')
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email } as AuthPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  return { token, user: { id: user.id, email: user.email, name: user.name } }
}

export async function register(email: string, password: string, name: string, invitationToken: string) {
  // Проверить приглашение
  const invitation = await prisma.invitation.findUnique({
    where: { token: invitationToken },
  })

  if (!invitation || invitation.email !== email) {
    throw new Error('Invalid or expired invitation')
  }

  if (invitation.usedAt) {
    throw new Error('Invitation already used')
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    throw new Error('Invitation expired')
  }

  // Проверить не зарегистрирован ли уже
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error('User already exists')
  }

  // Создать пользователя
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  })

  // Отметить приглашение как использованное
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { usedAt: new Date() },
  })

  const token = jwt.sign(
    { userId: user.id, email: user.email } as AuthPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  return { token, user: { id: user.id, email: user.email, name: user.name } }
}

export async function createInvitation(email: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней

  const invitation = await prisma.invitation.create({
    data: {
      email,
      token,
      expiresAt,
    },
  })

  return invitation
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded.userId) {
      throw new Error('Invalid token payload')
    }
    return { userId: decoded.userId, email: decoded.email } as AuthPayload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user
}
