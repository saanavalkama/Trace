import z from "zod";

export const createIssueSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
    description: z.string().max(5000, 'Description must be at most 5000 characters').default('')
})

export const changeStatusSchema = z.object({
    to: z.enum(['open', 'in_progress', 'in_review', 'closed'])
})

export const assignSchema = z.object({
    userId: z.string().uuid()
})

export const commentSchema = z.object({
    body: z.string().min(1, 'Comment body is required').max(5000, 'Comment must be at most 5000 characters')
})

export const addLabelSchema = z.object({
    label: z.string().min(1, 'Label is required').max(50, 'Label must be at most 50 characters')
})

export const linkSchema = z.object({
    linkedIIssueId: z.string().uuid(),
    linkType: z.enum(['blocks', 'blocked_by', 'relates_to', 'duplicates'])
})

export const closeSchema = z.object({
    reason: z.string().max(1000, 'Reason must be at most 1000 characters').optional()
})

export const moveToSprintSchema = z.object({
    sprintId: z.string().uuid()
})

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>
export type AssignInput = z.infer<typeof assignSchema>
export type CommentInput = z.infer<typeof commentSchema>
export type AddLabelInput = z.infer<typeof addLabelSchema>
export type LinkInput = z.infer<typeof linkSchema>
export type CloseInput = z.infer<typeof closeSchema>
export type MoveToSprintInput = z.infer<typeof moveToSprintSchema>
