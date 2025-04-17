import type { HttpContext } from '@adonisjs/core/http'

import { createProjectValidator, updateProjectValidator } from '#validators/project'
import Project from '#models/project'

export default class ProjectsController {
    async index() {
        const projects = await Project.query()
            .preload('tasks')
            .preload('occupations')
            .preload('users')
        return projects
    }

    async store({ request }: HttpContext) {
        const { 
            title, 
            description, 
            status, 
            priority, 
            start_date, 
            end_date,
            occupations,
            users
        } = await request.validateUsing(createProjectValidator)
        
        const project = await Project.create({
            title,
            description,
            status,
            priority,
            start_date,
            end_date
        })
        
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
            await project.load('tasks')
            await project.load('occupations')
            await project.load('users')
            return project
        } catch (error) {
            return response.status(400).json({error: "Project not found!"})
        }
    }

    async update({ request, params, response }: HttpContext) {
        try {
            const project = await Project.findByOrFail('id', params.id)
            const { 
                title, 
                description, 
                status, 
                priority, 
                start_date, 
                end_date,
                occupations,
                users
            } = await request.validateUsing(updateProjectValidator)
            
            project.merge({
                title,
                description,
                status,
                priority,
                start_date,
                end_date
            })
            await project.save()
            
            if (occupations && occupations.length > 0) {
                await project.related('occupations').sync(occupations)
            }
            
            if (users && users.length > 0) {
                await project.related('users').sync(users)
            }
            
            return project
        } catch (error) {
            return response.status(400).json({error: "Project not found!"})
        }
    }

    async destroy({ params, response }: HttpContext) {
        try {
            const project = await Project.findByOrFail('id', params.id)
            await project.delete()
            return response.status(203)
        } catch (error) {
            return response.status(400).json({error: "Project not found!"})
        }
    }
}
