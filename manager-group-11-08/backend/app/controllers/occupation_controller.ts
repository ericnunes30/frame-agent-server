import type { HttpContext } from '@adonisjs/core/http'

import { createOccupationValidator, updateOccupationValidator } from '#validators/occupation'
import Occupation from '#models/occupation'

export default class OccupationsController {
  async index() {
    const occupations = await Occupation.query()
      .preload('users')
      .preload('projects')
      .preload('tasks')
    return occupations
  }

  async store({ request }: HttpContext) {
    const { name, projects, tasks } = await request.validateUsing(createOccupationValidator)

    const occupation = await Occupation.create({ name })

    if (projects && projects.length > 0) {
      await occupation.related('projects').attach(projects)
    }

    if (tasks && tasks.length > 0) {
      await occupation.related('tasks').attach(tasks)
    }

    return occupation
  }

  async show({ params, response }: HttpContext) {
    try {
      const occupation = await Occupation.findByOrFail('id', params.id)
      await occupation.load('users')
      await occupation.load('projects')
      await occupation.load('tasks')
      return occupation
    } catch (error) {
      return response.status(400).json({ error: 'Occupation not found!' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const occupation = await Occupation.findByOrFail('id', params.id)
      const { name, projects, tasks } = await request.validateUsing(updateOccupationValidator)

      occupation.merge({ name })
      await occupation.save()

      if (projects && projects.length > 0) {
        await occupation.related('projects').sync(projects)
      }

      if (tasks && tasks.length > 0) {
        await occupation.related('tasks').sync(tasks)
      }

      return occupation
    } catch (error) {
      return response.status(400).json({ error: 'Occupation not found!' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const occupation = await Occupation.findByOrFail('id', params.id)
      await occupation.delete()
      return response.status(203)
    } catch (error) {
      return response.status(400).json({ error: 'Occupation not found!' })
    }
  }
}
