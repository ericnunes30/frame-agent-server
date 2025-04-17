import type { HttpContext } from '@adonisjs/core/http'

import User from '#models/user'
import { createUserValidator, updateUserValidator } from '#validators/user'

export default class UsersController {
  async index() {
    const users = await User.query()
      .preload('roles')
      .preload('occupation')
      .preload('occupations')
      .preload('projects')
      .preload('tasks')
      .preload('comments')
    return users
  }

  async store({ request }: HttpContext) {
    const { name, email, password, occupation_id, occupations, roles } = await request.validateUsing(createUserValidator)
    const user = await User.create({ name, email, password, occupationId: occupation_id })

    if (roles && roles.length > 0) {
      await user.related('roles').attach(roles)
    }

    if (occupations && occupations.length > 0) {
      await user.related('occupations').attach(occupations)
    } else if (occupation_id) {
      // Se não tiver occupations mas tiver occupation_id, adiciona como uma ocupação
      await user.related('occupations').attach([occupation_id])
    }

    return user
  }

  async show({ params, response }: HttpContext) {
    try {
      const user = await User.findByOrFail('id', params.id)
      await user.load('roles')
      await user.load('occupation')
      await user.load('occupations')
      await user.load('projects')
      await user.load('tasks')
      await user.load('comments')
      return user
    } catch (error) {
      return response.status(400).json({error: "User not found!"})
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const user = await User.findByOrFail('id', params.id)
      const { name, password, occupation_id, occupations, roles } = await request.validateUsing(updateUserValidator)

      user.merge({ name, password, occupationId: occupation_id })
      await user.save()

      if (roles && roles.length > 0) {
        await user.related('roles').sync(roles)
      }

      if (occupations && occupations.length > 0) {
        await user.related('occupations').sync(occupations)
      } else if (occupation_id) {
        // Se não tiver occupations mas tiver occupation_id, sincroniza como uma ocupação
        await user.related('occupations').sync([occupation_id])
      }

      return user
    } catch (error) {
      return response.status(400).json({error: "User not found!"})
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const user = await User.findByOrFail('id', params.id)
      await user.delete()
      return response.status(203)
    } catch (error) {
      return response.status(400).json({error: "User not found!"})
    }
  }
}
