import z from "zod";
import { SprintStatus } from "../generated/prisma/enums";

export const createSprintSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be at most 100 characters'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date()
})

export const updateSprintSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100, 'Name must be at most 100 characters').optional(),
    status: z.enum([SprintStatus.planned, SprintStatus.active, SprintStatus.completed]).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
})

export type CreateSprintInput = z.infer<typeof createSprintSchema>
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>
