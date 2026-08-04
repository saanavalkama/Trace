import { Request, Response } from "express"
import { inviteService } from "../services/invite.service"

export const inviteController = {

    getInviteByToken: async(req:Request, res:Response) => {
        const {token} = req.params as {token:string}

        const result = await inviteService.getInviteByToken(token)

        if(result.error === 'NOT_FOUND'){
            return res.status(404).json({message: 'Invite not found'})
        }
        if(result.error){
            return res.status(410).json({message:result.error})
        }

        res.status(200).json(result.data)
    },

    declineInvite: async(req:Request, res:Response) => {

        const {token} = req.params as {token:string}

        const result = await inviteService.declineInvite(token)

        if(result.error === 'NOT_FOUND'){
            return res.status(404).json({message: 'Invite not found'})
        }
        
        if(result.error){
            return res.status(410).json({message:result.error})
        }

        res.status(204).send()

    }
}