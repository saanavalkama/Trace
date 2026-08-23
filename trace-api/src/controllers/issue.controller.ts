import { Request, Response } from "express"
import { issueService } from "../services/issue.service"
import { ConflictError, ConcurrencyError, NotFoundError } from "../errors/errors"
import {
    addLabelSchema,
    assignSchema,
    changeStatusSchema,
    closeSchema,
    commentSchema,
    createIssueSchema,
    linkSchema,
    moveToSprintSchema
} from "../validationSchemas/issue.schema"

function handleIssueError(err: unknown, res: Response): boolean {
    if(err instanceof NotFoundError){
        res.status(404).json({message: err.message})
        return true
    }
    if(err instanceof ConflictError || err instanceof ConcurrencyError){
        res.status(409).json({message: err.message})
        return true
    }
    return false
}

export const issueController = {

    create: async(req:Request, res:Response) => {
        const result = createIssueSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {id: workspaceId} = req.params as {id:string}

        const issue = await issueService.create({
            title: result.data.title,
            description: result.data.description,
            reporterId: req.userId!,
            workspaceId
        })
        res.status(201).json(issue)
    },

    getById: async(req:Request, res:Response) => {
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.getById(issueId)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    changeStatus: async(req:Request, res:Response) => {
        const result = changeStatusSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.changeStatus(issueId, result.data.to, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    assign: async(req:Request, res:Response) => {
        const result = assignSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.assign(issueId, result.data.userId, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    unassign: async(req:Request, res:Response) => {
        const {issueId, userId} = req.params as {issueId:string, userId:string}
        try{
            const issue = await issueService.unassign(issueId, userId, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    comment: async(req:Request, res:Response) => {
        const result = commentSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.comment(issueId, result.data.body, req.userId!)
            res.status(201).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    addLabel: async(req:Request, res:Response) => {
        const result = addLabelSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.addLabel(issueId, result.data.label, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    link: async(req:Request, res:Response) => {
        const result = linkSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.link(issueId, result.data.linkedIIssueId, result.data.linkType, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    close: async(req:Request, res:Response) => {
        const result = closeSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.close(issueId, req.userId!, result.data.reason)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    reopen: async(req:Request, res:Response) => {
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.reopen(issueId, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    },

    moveToSprint: async(req:Request, res:Response) => {
        const result = moveToSprintSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const {issueId} = req.params as {issueId:string}
        try{
            const issue = await issueService.moveToSprint(issueId, result.data.sprintId, req.userId!)
            res.status(200).json(issue)
        } catch(err){
            if(handleIssueError(err, res)) return
            throw err
        }
    }
}
