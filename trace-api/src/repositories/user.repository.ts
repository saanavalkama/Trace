import { prisma } from '../db/prisma'

export const userRepository = {
  async findOrCreateByEmail(email: string) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return existing

    return prisma.user.create({ data: { email } })
  },
}