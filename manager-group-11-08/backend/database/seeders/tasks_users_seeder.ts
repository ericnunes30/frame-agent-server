import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Task from '#models/task'

export default class TasksUsersSeeder extends BaseSeeder {
  async run() {
    try {
      // Buscar usuários
      const developer = await User.findBy('email', 'dev@example.com')
      const designer = await User.findBy('email', 'designer@example.com')

      if (!developer || !designer) {
        console.error('Usuários não encontrados')
        return
      }

      // Buscar tarefas pelos títulos
      const configTask = await Task.findBy('title', 'Configurar ambiente de desenvolvimento')
      const apiTask = await Task.findBy('title', 'Desenvolver API RESTful')
      const authTask = await Task.findBy('title', 'Implementar autenticação')
      const wireframesTask = await Task.findBy('title', 'Criar wireframes')
      const designTask = await Task.findBy('title', 'Design de interface')

      if (!configTask || !apiTask || !authTask || !wireframesTask || !designTask) {
        console.error('Tarefas não encontradas')
        return
      }

      // Associar usuários a tarefas
      console.log('Associando tarefas ao desenvolvedor (ID:', developer.id, ')')
      await developer.related('tasks').attach([configTask.id, apiTask.id, authTask.id])

      console.log('Associando tarefas ao designer (ID:', designer.id, ')')
      await designer.related('tasks').attach([wireframesTask.id, designTask.id])

      console.log('Associações entre tarefas e usuários criadas com sucesso')
    } catch (error) {
      console.error('Erro ao associar tarefas a usuários:', error)
    }
  }
}
