import vine from '@vinejs/vine'
import { PriorityLevel, Status } from '#models/task'

export const createTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim(),
    description: vine.string().optional(),
    priority: vine.enum(Object.values(PriorityLevel)),
    status: vine.enum(Object.values(Status)),
    start_date: vine.string().optional(),
    due_date: vine.string().optional(),
    project_id: vine.number(),
    order: vine.number().optional(),
    timer: vine.number().optional(),
    task_reviewer_id: vine.number().optional(),
    video_url: vine.string().optional(),
    useful_links: vine
      .array(
        vine.object({
          title: vine.string(),
          url: vine.string().url(),
        })
      )
      .optional(),
    observations: vine.string().optional(),
    has_detailed_fields: vine.boolean().optional(),
    users: vine.array(vine.number()).optional(),
    occupations: vine.array(vine.number()).optional(),
  })
)

export const updateTaskValidator = vine.compile(
  vine.object({
    title: vine.string().trim().optional(),
    description: vine.string().optional(),
    priority: vine.enum(Object.values(PriorityLevel)).optional(),
    status: vine.enum(Object.values(Status)).optional(),
    start_date: vine.string().optional(),
    due_date: vine.string().optional(),
    startDate: vine.string().optional(),
    project_id: vine.number().optional(),
    order: vine.number().optional(),
    timer: vine.number().optional(),
    task_reviewer_id: vine.number().optional(),
    video_url: vine.string().optional(),
    useful_links: vine
      .array(
        vine.object({
          title: vine.string(),
          url: vine.string().url(),
        })
      )
      .optional(),
    observations: vine.string().optional(),
    has_detailed_fields: vine.boolean().optional(),
    users: vine.array(vine.number()).optional(),
    occupations: vine.array(vine.number()).optional(),
  })
)
