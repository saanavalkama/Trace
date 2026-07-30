import z from "zod";

export const createWorkspaceSchema = z.object({
    name: 
        z
        .string()
        .min(2, 'Name must be at least 2 characters long')
        .max(50, 'Name must be at most 50 characthers')
})

export const updateWorkspaceSchema = z.object({
    name: 
        z
        .string()
        .min(2, 'Name must be at least 2 characters long')
        .max(50, 'Name must be at most 50 characthers')
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>