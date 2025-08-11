import type { HttpContext } from '@adonisjs/core/http'

import { createRoleValidator, updateRoleValidator } from '#validators/role'
import Role from '#models/role'

export default class RolesController {
  async index() {
    const roles = await Role.query().preload('users')
    return roles
  }

  async store({ request }: HttpContext) {
    const { name, description, users } = await request.validateUsing(createRoleValidator)

    const role = await Role.create({
      name,
      description,
    })

    if (users && users.length > 0) {
      await role.related('users').attach(users)
    }

    return role
  }

  async show({ params, response }: HttpContext) {
    try {
      const role = await Role.findByOrFail('id', params.id)
      await role.load('users')
      return role
    } catch (error) {
      return response.status(400).json({ error: 'Role not found!' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const role = await Role.findByOrFail('id', params.id)
      const { name, description, users } = await request.validateUsing(updateRoleValidator)

      role.merge({
        name,
        description,
      })
      await role.save()

      if (users && users.length > 0) {
        await role.related('users').sync(users)
      }

      return role
    } catch (error) {
      return response.status(400).json({ error: 'Role not found!' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const role = await Role.findByOrFail('id', params.id)
      await role.delete()
      return response.status(203)
    } catch (error) {
      return response.status(400).json({ error: 'Role not found!' })
    }
  }
}
