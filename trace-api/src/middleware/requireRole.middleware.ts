import { Response, Request, NextFunction } from 'express'
import { WorkspaceRole } from '../generated/prisma/enums'
import { prisma } from '../db/prisma'

export function requireRole(...allowedRoles: WorkspaceRole[]){
    return async (req: Request, res:Response, next:NextFunction) => {
        const workspaceId = req.params.id as string
        if(!workspaceId){
            return res.status(400).json({message:'Missing workspace id'})
        }

        const membership = await prisma.workspaceMember.findUnique({
            where:{
                workspaceId_userId:{
                    workspaceId,
                    userId: req.userId!
                }
            }
        })

        if(!membership){
            return res.status(403).json({message:'Not a member of this workspace'})
        }

        if(!allowedRoles.includes(membership.role)){
            return res.status(403).json({message:'Insufficient permissions'})
        }

        next()
    }
}