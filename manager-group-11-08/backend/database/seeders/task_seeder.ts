import Task from '#models/task'
import Project from '#models/project'
import { PriorityLevel, Status } from '#models/task'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

export default class TaskSeeder extends BaseSeeder {
  async run() {
    try {
      // Limpar tarefas existentes
      await Task.truncate(true)

      // Buscar projetos pelo título
      const projects = await Project.all()

      if (projects.length === 0) {
        console.error('Nenhum projeto encontrado. Não é possível criar tarefas.')
        return
      }

      // Encontrar os projetos pelos títulos
      const project1 = projects.find((p) => p.title === 'Sistema de Gerenciamento de Tarefas')
      const project2 = projects.find((p) => p.title === 'Redesign do Site Institucional')

      if (!project1 || !project2) {
        console.error('Projetos específicos não encontrados')
        return
      }

      console.log('Criando tarefas para o projeto 1 (ID:', project1.id, ')')

      // Projeto 1: Sistema de Gerenciamento de Tarefas
      await Task.create({
        title: 'Configurar ambiente de desenvolvimento',
        description: 'Configurar servidores, banco de dados e ambiente de desenvolvimento',
        priority: PriorityLevel.High,
        status: Status.Done,
        start_date: DateTime.now().minus({ days: 30 }),
        due_date: DateTime.now().minus({ days: 25 }),
        project_id: project1.id,
        order: 1,
      })

      await Task.create({
        title: 'Desenvolver API RESTful',
        description: 'Criar endpoints da API para o sistema de gerenciamento',
        priority: PriorityLevel.High,
        status: Status.InProgress,
        start_date: DateTime.now().minus({ days: 20 }),
        due_date: DateTime.now().plus({ days: 10 }),
        project_id: project1.id,
        order: 2,
      })

      await Task.create({
        title: 'Implementar autenticação',
        description: 'Implementar sistema de autenticação e autorização',
        priority: PriorityLevel.Medium,
        status: Status.ToDo,
        start_date: DateTime.now().plus({ days: 5 }),
        due_date: DateTime.now().plus({ days: 15 }),
        project_id: project1.id,
        order: 3,
      })

      console.log('Criando tarefas para o projeto 2 (ID:', project2.id, ')')

      // Projeto 2: Redesign do Site Institucional
      await Task.create({
        title: 'Criar wireframes',
        description: 'Desenvolver wireframes para as principais páginas do site',
        priority: PriorityLevel.Medium,
        status: Status.Done,
        start_date: DateTime.now().minus({ days: 15 }),
        due_date: DateTime.now().minus({ days: 10 }),
        project_id: project2.id,
        order: 1,
      })

      await Task.create({
        title: 'Design de interface',
        description: 'Criar design visual para o site baseado nos wireframes',
        priority: PriorityLevel.Medium,
        status: Status.InProgress,
        start_date: DateTime.now().minus({ days: 8 }),
        due_date: DateTime.now().plus({ days: 5 }),
        project_id: project2.id,
        order: 2,
      })

      console.log('Tarefas criadas com sucesso')
    } catch (error) {
      console.error('Erro ao criar tarefas:', error)
    }
  }
}
