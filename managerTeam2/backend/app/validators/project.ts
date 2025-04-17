import vine from '@vinejs/vine'
import { PriorityLevel } from '#models/project'

export const createProjectValidator = vine.compile(
    vine.object({
        title: vine.string().trim(),
        description: vine.string().optional(),
        status: vine.boolean(),
        priority: vine.enum(Object.values(PriorityLevel)),
        start_date: vine.date(),
        end_date: vine.date(),
        occupations: vine.array(vine.number()).optional(),
        users: vine.array(vine.number()).optional()
    })
)

export const updateProjectValidator = vine.compile(
    vine.object({
        title: vine.string().trim().optional(),
        description: vine.string().optional(),
        status: vine.boolean().optional(),
        priority: vine.enum(Object.values(PriorityLevel)).optional(),
        start_date: vine.date().optional(),
        end_date: vine.date().optional(),
        occupations: vine.array(vine.number()).optional(),
        users: vine.array(vine.number()).optional()
    })
)
