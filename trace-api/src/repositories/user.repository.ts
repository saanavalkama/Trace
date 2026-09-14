import { prisma } from '../db/prisma'
import { ActorDto } from '../types/types'

export const userRepository = {
  async findOrCreateByEmail(email: string) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return existing

    return prisma.user.create({ data: { email } })
  },

  findById: async(id:string) => {
    return prisma.user.findUnique({
        where:{id}
    })
  },

  findByIds: async(ids:string[]) => {
    return prisma.user.findMany({
        where:{id:{in:ids}}
    })
  },

  resolveActorsById: async(ids:string[]): Promise<Map<string, ActorDto>> => {
    const uniqueIds = [...new Set(ids)]
    if(uniqueIds.length === 0) return new Map()
    const users = await prisma.user.findMany({ where: { id: { in: uniqueIds } } })
    return new Map(users.map((user) => [user.id, { id: user.id, email: user.email }]))
  }
}