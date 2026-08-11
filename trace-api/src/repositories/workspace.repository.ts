import {prisma} from '../db/prisma'
import { Prisma } from '../generated/prisma/client'
import { WorkspaceRole } from '../generated/prisma/enums'
import { UpdateWorkspaceData } from '../types/types'



export const workspaceRepository = {

    createWithOwner: async(name:string, userId:string) => {
        return await prisma.workspace.create({
            data: {
                name,
                members:{
                    create:{userId,role:WorkspaceRole.owner}
                },
            },
            include: {members:true}
        })
    },

    getWorkspacesByUserId: async(userId:string) => {
        return await prisma.workspace.findMany({
            where: {members: {some: {userId}}}
        })
    },

    getWorkspaceById: async(id:string) => {
        return await prisma.workspace.findUnique({
            where:{id},
            include:{members:true}
        })
    },

    updateWorkspace:async(id:string, data:UpdateWorkspaceData) => {
        try{
            return await prisma.workspace.update({
                where:{id},
                data
            })
        } catch(err){
            if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025' ){
                return null
            }
            throw err
        }
    },

    deleteWorkspace:async(id: string) => {
        try {
            return await prisma.workspace.delete({ where: { id } })
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
                return null
            }
            throw err
        }
    },

    getMembersByWorkspaceId: async(workspaceId:string) =>{
        return await prisma.workspaceMember.findMany({
            where:{workspaceId},
            include:{user:{select:{id:true, email:true}}}
        })
    },

    removeMember: async(workspaceId:string, userId:string) =>{
        try{
            return await prisma.workspaceMember.delete({
                where:{workspaceId_userId:{
                    workspaceId, userId
                }}
            })
        }catch(err){
            if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'){
                return null
            }
            throw err
        }
    },

    getMembership:async(workspaceId: string, userId: string)=> {
        return await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        })
    },

    addMember: async(workspaceId:string, userId:string, role: WorkspaceRole)=>{
        return await prisma.workspaceMember.create({
            data:{
                workspaceId,
                userId,
                role
            }
        })
    },

    findMemberByEmail: async(workspaceId:string, email:string) => {
        return await prisma.workspaceMember.findFirst({
            where:{
                workspaceId, user:{email}
            }
        })
    }

    
}