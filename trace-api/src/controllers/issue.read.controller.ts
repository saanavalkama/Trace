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
    }
}
