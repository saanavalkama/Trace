import { Request, Response } from "express"
import { issueReadService } from "../services/issue.read.service"
import { NotFoundError } from "../errors/errors"

export const issueReadController = {

    getBoardBySprint: async(req:Request, res:Response) => {
        const {id: workspaceId, sprintId} = req.params as {id:string, sprintId:string}
        try{
            const board = await issueReadService.getBoardBySprint(workspaceId, sprintId)
            res.status(200).json(board)
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    },

    getActivity: async(req:Request, res:Response) => {
        const {id: workspaceId, issueId} = req.params as {id:string, issueId:string}
        try{
            const activity = await issueReadService.getActivity(workspaceId, issueId)
            res.status(200).json(activity)
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    },

    getComments: async(req:Request, res:Response) => {
        const {id: workspaceId, issueId} = req.params as {id:string, issueId:string}
        try{
            const comments = await issueReadService.getComments(workspaceId, issueId)
            res.status(200).json(comments)
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    },

    getLabels: async(req:Request, res:Response) => {
        const {id: workspaceId, issueId} = req.params as {id:string, issueId:string}
        try{
            const labels = await issueReadService.getLabels(workspaceId, issueId)
            res.status(200).json(labels)
        } catch(err){
            if(err instanceof NotFoundError){
                return res.status(404).json({message: err.message})
            }
            throw err
        }
    }
}
