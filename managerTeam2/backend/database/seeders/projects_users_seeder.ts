import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Project from '#models/project'

export default class ProjectsUsersSeeder extends BaseSeeder {
  async run() {
    try {
      // Buscar usuários
      const admin = await User.findBy('email', 'admin@example.com')
      const manager = await User.findBy('email', 'gerente@example.com')
      const developer = await User.findBy('email', 'dev@example.com')
      const designer = await User.findBy('email', 'designer@example.com')

      if (!admin || !manager || !developer || !designer) {
        console.error('Usuários não encontrados')
        return
      }

      // Buscar projetos pelos títulos
      const projects = await Project.all()

      if (projects.length === 0) {
        console.error('Nenhum projeto encontrado')
        return
      }

      // Encontrar os projetos pelos títulos
      const taskManagement = projects.find(p => p.title === 'Sistema de Gerenciamento de Tarefas')
      const websiteRedesign = projects.find(p => p.title === 'Redesign do Site Institucional')
      const mobileApp = projects.find(p => p.title === 'Aplicativo Mobile')

      if (!taskManagement || !websiteRedesign || !mobileApp) {
        console.error('Projetos específicos não encontrados')
        return
      }

      // Associar usuários a projetos
      console.log('Associando usuários ao projeto Sistema de Gerenciamento de Tarefas (ID:', taskManagement.id, ')')
      await taskManagement.related('users').attach([
        admin.id,
        manager.id,
        developer.id
      ])

      console.log('Associando usuários ao projeto Redesign do Site Institucional (ID:', websiteRedesign.id, ')')
      await websiteRedesign.related('users').attach([
        manager.id,
        designer.id
      ])

      console.log('Associando usuários ao projeto Aplicativo Mobile (ID:', mobileApp.id, ')')
      await mobileApp.related('users').attach([
        admin.id,
        manager.id,
        developer.id,
        designer.id
      ])

      console.log('Associações entre projetos e usuários criadas com sucesso')
    } catch (error) {
      console.error('Erro ao associar projetos a usuários:', error)
    }
  }
}
