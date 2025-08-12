import type { HttpContext } from '@adonisjs/core/http'

import User from '#models/user'
import { createUserValidator, updateUserValidator } from '#validators/user'

export default class UsersController {
  async index() {
    const users = await User.query()
      .preload('roles')
      .preload('occupations')
      .preload('projects')
      .preload('tasks')
      .preload('comments')
    return users
  }

  async store({ request }: HttpContext) {
    const { name, email, password, occupations, roles } =
      await request.validateUsing(createUserValidator)
    const user = await User.create({ name, email, password })

    if (roles && roles.length > 0) {
      await user.related('roles').attach(roles)
    }

    if (occupations && occupations.length > 0) {
      await user.related('occupations').attach(occupations)
    }

    return user
  }

  async show({ params, response }: HttpContext) {
    try {
      const user = await User.findByOrFail('id', params.id)
      await user.load('roles')
      await user.load('occupations')
      await user.load('projects')
      await user.load('tasks')
      await user.load('comments')
      return user
    } catch (error) {
      return response.status(400).json({ error: 'User not found!' })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      console.log('Método de requisição:', request.method())
      console.log('Dados recebidos para atualização:', request.body())

      const user = await User.findByOrFail('id', params.id)
      console.log('Usuário antes da atualização:', user.toJSON())

      const { name, email, password, occupations, roles } =
        await request.validateUsing(updateUserValidator)
      console.log('Dados validados:', {
        name,
        email,
        password: password ? '[REDACTED]' : undefined,
        occupations,
        roles,
      })

      // Incluir email na operação merge
      user.merge({ name, email, password })
      await user.save()

      console.log('Usuário após atualização:', user.toJSON())

      if (roles && roles.length > 0) {
        await user.related('roles').sync(roles)
      }

      if (occupations && occupations.length > 0) {
        await user.related('occupations').sync(occupations)
      }

      return user
    } catch (error) {
      return response.status(400).json({ error: 'User not found!' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const user = await User.findByOrFail('id', params.id)
      await user.delete()
      return response.status(203)
    } catch (error) {
      return response.status(400).json({ error: 'User not found!' })
    }
  }
}
