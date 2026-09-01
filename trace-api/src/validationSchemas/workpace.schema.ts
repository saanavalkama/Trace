import z from "zod";
import { WorkspaceRole } from "../generated/prisma/enums";

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

export const sendInviteSchema = z.object({
    email: z.string().email(),
    role: z.enum([WorkspaceRole.admin, WorkspaceRole.member, WorkspaceRole.owner])
})

export const sendManyInvitesSchema = z.object({
    invites: z
        .array(sendInviteSchema)
        .min(1, 'At least one invite is required')
        .max(50, 'Cannot send more than 50 invites at once')
        .refine(
            (invites) => new Set(invites.map(i => i.email.toLowerCase())).size === invites.length,
            { message: 'Duplicate email addresses in the same batch' }
        ),
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type SendInviteInput = z.infer<typeof sendInviteSchema>