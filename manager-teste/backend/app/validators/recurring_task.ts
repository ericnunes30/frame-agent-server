import vine from '@vinejs/vine'
import { ScheduleType } from '#models/recurring_task'
import { PriorityLevel } from '#models/task'

export const createRecurringTaskValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
    schedule_type: vine.enum(Object.values(ScheduleType)),
    frequency_interval: vine.string().optional(),
    frequency_cron: vine.string().optional(),
    next_due_date: vine.string().optional(),
    is_active: vine.boolean().optional(),
    userId: vine.number(),
    projectId: vine.number(),
    templateData: vine.object({
      title: vine.string().trim(),
      description: vine.string().optional(),
      priority: vine.enum(Object.values(PriorityLevel)),
      assignee_ids: vine.array(vine.number()).optional(),
      occupation_ids: vine.array(vine.number()).optional(),
      start_date: vine.string().optional(),
      due_date: vine.string().optional(),
    }),
  })
)

export const updateRecurringTaskValidator = vine.compile(
  vine.object({
    name: vine.string().trim().optional(),
    schedule_type: vine.enum(Object.values(ScheduleType)).optional(),
    frequency_interval: vine.string().optional(),
    frequency_cron: vine.string().optional(),
    next_due_date: vine.string().optional(),
    is_active: vine.boolean().optional(),
    userId: vine.number().optional(),
    projectId: vine.number().optional(),
    templateData: vine
      .object({
        title: vine.string().trim().optional(),
        description: vine.string().optional(),
        priority: vine.enum(Object.values(PriorityLevel)).optional(),
        assignee_ids: vine.array(vine.number()).optional(),
        occupation_ids: vine.array(vine.number()).optional(),
        start_date: vine.string().optional(),
        due_date: vine.string().optional(),
      })
      .optional(),
  })
)
