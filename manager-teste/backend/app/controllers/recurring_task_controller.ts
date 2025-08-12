import type { HttpContext } from '@adonisjs/core/http'
import {
  createRecurringTaskValidator,
  updateRecurringTaskValidator,
} from '#validators/recurring_task'
import RecurringTask from '#models/recurring_task'
import { DateTime } from 'luxon'
import Occupation from '#models/occupation'

export default class RecurringTasksController {
  /**
   * Display a list of recurring tasks.
   */
  async index({ response }: HttpContext) {
    const recurringTasks = await RecurringTask.query().preload('user')

    const tasksWithOccupations = await Promise.all(
      recurringTasks.map(async (task) => {
        const taskJson = task.toJSON()
        if (
          taskJson.templateData.occupation_ids &&
          taskJson.templateData.occupation_ids.length > 0
        ) {
          const occupations = await Occupation.query().whereIn(
            'id',
            taskJson.templateData.occupation_ids
          )
          taskJson.templateData.occupations = occupations
        }
        return taskJson
      })
    )

    return response.ok(tasksWithOccupations)
  }

  /**
   * Create a new recurring task.
   */
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createRecurringTaskValidator)

    // TODO: Adicionar lógica para calcular a primeira next_due_date baseada na frequência
    const recurringTask = await RecurringTask.create({
      name: payload.name,
      templateData: {
        ...payload.templateData,
        occupation_ids: payload.templateData.occupation_ids,
      },
      next_due_date: payload.next_due_date
        ? DateTime.fromISO(payload.next_due_date)
        : DateTime.now(),
      is_active: payload.is_active ?? true,
      schedule_type: payload.schedule_type,
      frequency_interval: payload.frequency_interval,
      frequency_cron: payload.frequency_cron,
      userId: payload.userId,
      projectId: payload.projectId,
    })

    const taskJson = recurringTask.toJSON()
    if (taskJson.templateData.occupation_ids && taskJson.templateData.occupation_ids.length > 0) {
      const occupations = await Occupation.query().whereIn(
        'id',
        taskJson.templateData.occupation_ids
      )
      taskJson.templateData.occupations = occupations
    }

    return response.created(taskJson)
  }

  /**
   * Show details of a single recurring task.
   */
  async show({ params, response }: HttpContext) {
    const recurringTask = await RecurringTask.query()
      .where('id', params.id)
      .preload('user')
      .firstOrFail()

    const taskJson = recurringTask.toJSON()
    if (taskJson.templateData.occupation_ids && taskJson.templateData.occupation_ids.length > 0) {
      const occupations = await Occupation.query().whereIn(
        'id',
        taskJson.templateData.occupation_ids
      )
      taskJson.templateData.occupations = occupations
    }

    return response.ok(taskJson)
  }

  /**
   * Update a recurring task.
   */
  async update({ params, request, response }: HttpContext) {
    const recurringTask = await RecurringTask.findOrFail(params.id)
    const payload = await request.validateUsing(updateRecurringTaskValidator)

    const { templateData, next_due_date, ...restOfPayload } = payload

    // Mescla os campos de nível superior
    recurringTask.merge(restOfPayload)

    // Trata a data separadamente
    if (next_due_date) {
      recurringTask.next_due_date = DateTime.fromISO(next_due_date)
    }

    // Mescla o objeto aninhado templateData separadamente
    if (templateData) {
      recurringTask.templateData = {
        ...recurringTask.templateData,
        ...templateData,
        occupation_ids: templateData.occupation_ids || recurringTask.templateData.occupation_ids,
      }
    }

    await recurringTask.save()

    const taskJson = recurringTask.toJSON()
    if (taskJson.templateData.occupation_ids && taskJson.templateData.occupation_ids.length > 0) {
      const occupations = await Occupation.query().whereIn(
        'id',
        taskJson.templateData.occupation_ids
      )
      taskJson.templateData.occupations = occupations
    }

    return response.ok(taskJson)
  }

  /**
   * Delete a recurring task.
   */
  async destroy({ params, response }: HttpContext) {
    const recurringTask = await RecurringTask.findOrFail(params.id)
    await recurringTask.delete()
    return response.noContent()
  }
}
