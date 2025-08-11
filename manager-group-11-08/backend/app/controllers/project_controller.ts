import type { HttpContext } from '@adonisjs/core/http'

import { createProjectValidator, updateProjectValidator } from '#validators/project'
import Project from '#models/project'

export default class ProjectsController {
  async index() {
    const projects = await Project.query()
      .preload('tasks', (tasksQuery) => {
        tasksQuery.preload('users').preload('occupations')
      })
      .preload('occupations')
      .preload('users')
    return projects
  }

  async store({ request }: HttpContext) {
    const { title, description, status, priority, start_date, end_date, occupations, users } =
      await request.validateUsing(createProjectValidator)

    const project = await Project.create({
      title,
      description,
      status,
      priority,
      start_date,
      end_date,
    } as any)

    if (occupations && occupations.length > 0) {
      await project.related('occupations').attach(occupations)
    }

    if (users && users.length > 0) {
      await project.related('users').attach(users)
    }

    return project
  }

  async show({ params, response }: HttpContext) {
    try {
      const project = await Project.findByOrFail('id', params.id)
      await project.load('tasks', (tasksQuery) => {
        tasksQuery.preload('users').preload('occupations')
      })
      await project.load('occupations')
      await project.load('users')
      return project
    } catch (error) {
      return response.status(400).json({ error: 'Project not found!' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const project = await Project.findByOrFail('id', params.id)
      const { title, description, status, priority, start_date, end_date, occupations, users } =
        await request.validateUsing(updateProjectValidator)

      project.merge({
        title,
        description,
        status,
        priority,
        start_date,
        end_date,
      } as any)
      await project.save()

      if (occupations && occupations.length > 0) {
        await project.related('occupations').sync(occupations)
      }

      if (users && users.length > 0) {
        await project.related('users').sync(users)
      }

      return project
    } catch (error) {
      return response.status(400).json({ error: 'Project not found!' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      // Adicionar log para depuração
      console.log(`Tentando excluir projeto com ID: ${params.id}`)

      const project = await Project.findByOrFail('id', params.id)
      console.log(`Projeto encontrado:`, project.toJSON())

      // Remover as relações antes de excluir o projeto
      // Desanexar todas as ocupações (equipes)
      await project.related('occupations').detach()

      // Desanexar todos os usuários
      await project.related('users').detach()

      // Carregar as tarefas relacionadas
      await project.load('tasks')

      // Excluir todas as tarefas relacionadas ao projeto
      if (project.tasks && project.tasks.length > 0) {
        console.log(
          `Excluindo ${project.tasks.length} tarefas relacionadas ao projeto ${params.id}`
        )
        for (const task of project.tasks) {
          // Desanexar relações da tarefa
          await task.related('users').detach()
          await task.related('occupations').detach()

          // Excluir a tarefa
          await task.delete()
        }
      }

      // Excluir o projeto
      await project.delete()

      // Retornar status 204 (No Content) que é o padrão para operações de exclusão bem-sucedidas
      // O status 203 (Non-Authoritative Information) não é apropriado para exclusões
      return response.status(204).send({})
    } catch (error) {
      console.error(`Erro ao excluir projeto:`, error)
      return response.status(400).json({ error: 'Project not found!' })
    }
  }
}
