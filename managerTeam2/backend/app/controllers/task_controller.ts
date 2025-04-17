import type { HttpContext } from '@adonisjs/core/http'

import { createTaskValidator, updateTaskValidator } from '#validators/task'
import Task from '#models/task'

export default class TasksController {
    async index({}: HttpContext) {
        // Retorna todas as tarefas com seus relacionamentos
        const tasks = await Task.query()
            .preload('project')
            .preload('users')
            .preload('occupations')
        return tasks
    }

    async store({ request, auth }: HttpContext) {
        const data = await request.validateUsing(createTaskValidator)

        // Verificar se os campos startDate e dueDate foram enviados
        if (data.startDate !== undefined) {
            data.start_date = data.startDate
            delete data.startDate
        }
        if (data.dueDate !== undefined) {
            data.due_date = data.dueDate
            delete data.dueDate
        }
        if (data.projectId !== undefined) {
            data.project_id = data.projectId
            delete data.projectId
        }

        const {
            title,
            description,
            priority,
            status,
            start_date,
            due_date,
            project_id,
            order,
            users,
            occupations
        } = data

        const task = await Task.create({
            title,
            description,
            priority,
            status,
            start_date,
            due_date,
            project_id,
            order
        } as any)

        if (users && users.length > 0) {
            await task.related('users').attach(users)
        } else {
            // Attach current user if no users specified
            await task.related('users').attach([auth.user!.id])
        }

        if (occupations && occupations.length > 0) {
            await task.related('occupations').attach(occupations)
        }

        return task
    }

    async show({ params, response }: HttpContext) {
        try {
            const task = await Task.findByOrFail('id', params.id)
            await task.load('project')
            await task.load('users')
            await task.load('occupations')
            return task
        } catch (error) {
            return response.status(400).json({error: "Task not found!"})
        }
    }

    async update({ request, params, response }: HttpContext) {
        try {
            const task = await Task.findByOrFail('id', params.id)
            const data = await request.validateUsing(updateTaskValidator)

            // Log para depuração
            console.log('Dados recebidos para atualização:', data)

            task.merge(data as any)
            await task.save()

            if (data.users && data.users.length > 0) {
                await task.related('users').sync(data.users)
            }

            if (data.occupations && data.occupations.length > 0) {
                await task.related('occupations').sync(data.occupations)
            }

            // Recarregar a tarefa com seus relacionamentos antes de retornar
            await task.refresh()
            await task.load('project')
            await task.load('users')
            await task.load('occupations')

            // Log para depuração
            console.log('Tarefa atualizada:', task.toJSON())

            return task
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error)
            return response.status(400).json({error: "Task not found!"})
        }
    }

    async destroy({ params, response }: HttpContext) {
        try {
            const task = await Task.findByOrFail('id', params.id)
            await task.delete()
            return response.status(203)
        } catch (error) {
            return response.status(400).json({error: "Task not found!"})
        }
    }
}
