import { prisma } from '../db/prisma'
import { Prisma } from '../generated/prisma/client'
import { CreateSprintData, UpdateSprintData } from '../types/types'

export const sprintRepository = {

    create: async(workspaceId:string, data:CreateSprintData) => {
        return await prisma.sprint.create({
            data: {workspaceId, ...data}
        })
    },

    getByWorkspaceId: async(workspaceId:string) => {
        return await prisma.sprint.findMany({
            where: {workspaceId},
            orderBy: {startDate: 'asc'}
        })
    },

    getById: async(id:string) => {
        return await prisma.sprint.findUnique({where: {id}})
    },

    update: async(id:string, data:UpdateSprintData) => {
        try{
            return await prisma.sprint.update({where: {id}, data})
        } catch(err){
            if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'){
                return null
            }
            throw err
        }
    },

    delete: async(id:string) => {
        try{
            return await prisma.sprint.delete({where: {id}})
        } catch(err){
            if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'){
                return null
            }
            throw err
        }
    }
}

