import Project from '#models/project'
import { PriorityLevel } from '#models/project'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

export default class ProjectSeeder extends BaseSeeder {
  async run() {
    try {
      console.log('Criando projetos...')

      // Cria projetos de teste
      const project1 = await Project.create({
        title: 'Sistema de Gerenciamento de Tarefas',
        description: 'Desenvolvimento de um sistema para gerenciar tarefas e projetos de equipes',
        status: true,
        priority: PriorityLevel.High,
        start_date: DateTime.now().minus({ days: 30 }),
        end_date: DateTime.now().plus({ days: 60 }),
      })

      console.log('Projeto 1 criado:', project1.id)

      const project2 = await Project.create({
        title: 'Redesign do Site Institucional',
        description: 'Atualização do design e conteúdo do site institucional da empresa',
        status: true,
        priority: PriorityLevel.Medium,
        start_date: DateTime.now().minus({ days: 15 }),
        end_date: DateTime.now().plus({ days: 45 }),
      })

      console.log('Projeto 2 criado:', project2.id)

      const project3 = await Project.create({
        title: 'Aplicativo Mobile',
        description: 'Desenvolvimento de um aplicativo mobile para clientes',
        status: false,
        priority: PriorityLevel.Urgent,
        start_date: DateTime.now().plus({ days: 15 }),
        end_date: DateTime.now().plus({ days: 90 }),
      })

      console.log('Projeto 3 criado:', project3.id)

      // Verificar se os projetos foram criados
      const projects = await Project.all()
      console.log('Total de projetos criados:', projects.length)
    } catch (error) {
      console.error('Erro ao criar projetos:', error)
    }
  }
}
