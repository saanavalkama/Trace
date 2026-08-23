import { Request, Response } from "express"
import { sprintService } from "../services/sprint.service"
import { createSprintSchema, updateSprintSchema } from "../validationSchemas/sprint.schema"
import { ConflictError, NotFoundError } from "../errors/errors"

export const sprintController = {

    create: async(req:Request, res:Response) => {
        const result = createSprintSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {id: workspaceId} = req.params as {id:string}
        try{
            const sprint = await sprintService.create(workspaceId, result.data)
            res.status(201).json(sprint)
        } catch(err){
            if(err instanceof ConflictError){
                return res.status(409).json({message: err.message})
            }
            throw err
        }
    },

    getByWorkspaceId: async(req:Request, res:Response) => {
        const {id: workspaceId} = req.params as {id:string}
        const sprints = await sprintService.getByWorkspaceId(workspaceId)
        res.status(200).json(sprints)
    },

    getById: async(req:Request, res:Response) => {
        const {sprintId} = req.params as {sprintId:string}
        try{
            const sprint = await sprintService.getById(sprintId)
            res.status(200).json(sprint)
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    },

    update: async(req:Request, res:Response) => {
        const result = updateSprintSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {sprintId} = req.params as {sprintId:string}
        try{
            const sprint = await sprintService.update(sprintId, result.data)
            res.status(200).json(sprint)
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

    delete: async(req:Request, res:Response) => {
        const {sprintId} = req.params as {sprintId:string}
        try{
            await sprintService.delete(sprintId)
            res.status(204).send()
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    }
}
