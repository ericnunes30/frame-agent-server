import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Occupation from '#models/occupation'
import Task from '#models/task'

export default class OccupationsTasksSeeder extends BaseSeeder {
  async run() {
    try {
      // Buscar ocupações
      const backendDev = await Occupation.findBy('name', 'Desenvolvedor Backend')
      const designer = await Occupation.findBy('name', 'Designer UI/UX')

      if (!backendDev || !designer) {
        console.error('Ocupações não encontradas')
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

      // Associar ocupações a tarefas
      console.log('Associando tarefas à ocupação de Desenvolvedor Backend (ID:', backendDev.id, ')')
      await backendDev.related('tasks').attach([
        configTask.id,
        apiTask.id,
        authTask.id
      ])

      console.log('Associando tarefas à ocupação de Designer UI/UX (ID:', designer.id, ')')
      await designer.related('tasks').attach([
        wireframesTask.id,
        designTask.id
      ])

      console.log('Associações entre ocupações e tarefas criadas com sucesso')
    } catch (error) {
      console.error('Erro ao associar ocupações a tarefas:', error)
    }
  }
}
