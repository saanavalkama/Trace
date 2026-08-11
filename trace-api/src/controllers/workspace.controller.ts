import { Request, Response } from "express"
import { createWorkspaceSchema, sendInviteSchema, updateWorkspaceSchema } from "../validationSchemas/workpace.schema"
import { workspaceService } from "../services/workspace.service"
import { ConflictError, NotFoundError } from "../errors/errors"

export const workspaceController = {

    createWorkspace: async(req:Request, res:Response)=>{
        const result = createWorkspaceSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const workspace = await workspaceService.create(result.data.name, req.userId!)
        res.status(201).json(workspace)
    },

    getWorkspaces:async(req:Request, res:Response) =>{
        const workspaces = await workspaceService.getWorkspacesByUserId(req.userId!)
        res.status(200).json(workspaces)
    },

    getWorkspaceById: async(req:Request, res:Response) => {
        const {id} = req.params as {id:string}
        const workspace = await workspaceService.getWorkspaceById(id)
        if(!workspace){
            return res.status(404).json({message:'Workspace not found'})
        }
        res.status(200).json(workspace)
    },

    updateWorkspace: async(req:Request, res:Response) => {
        const {id} = req.params as {id:string}
        const result = updateWorkspaceSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors:result.error.flatten().fieldErrors})
        }
        const data = {
            name:result.data.name
        }
        try{
            const workspace = await workspaceService.updateWorkspace(id, data)
            res.status(200).json(workspace)
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    },

    deleteWorkspace: async(req:Request,res:Response) => {
        const {id} = req.params as {id:string}
        try{
            await workspaceService.deleteWorkspace(id)
            res.status(204).send()
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    },

    getMembers: async(req:Request, res:Response) => {
       const {id} = req.params as {id:string}
       const members = await workspaceService.getMembers(id)
       res.status(200).json(members)
    },

    removeMember: async(req:Request, res:Response) =>{
        const {id, userId} = req.params as {id:string, userId:string}
        try{
            await workspaceService.removeMember(id, userId)
            res.status(204).send()
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            if(err instanceof ConflictError){
                return res.status(409).json({message: err.message})
            }
            throw err
        }
    },

    sendInvite: async(req:Request, res:Response) => {
        const result = sendInviteSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {id} = req.params as {id:string}
        const serviceResult= await workspaceService.sendInvite(id, result.data)

        if(serviceResult.error === 'ALREADY_INVITED'){
            return res.status(409).json({message:'This email already has pending invite to this workspace'})
        }
        if(serviceResult.error === 'ALREADY_MEMBER'){
            return res.status(409).json({message:'This user is already a member'})
        }

        res.status(201).json(serviceResult.data)
    },

    getInvites: async(req:Request, res:Response) => {
        const {id} = req.params as {id:string}
        const invites = await workspaceService.getInvites(id)
        res.status(200).json(invites)
    }
}