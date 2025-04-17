import Comment from '#models/comment'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Task from '#models/task'

export default class CommentSeeder extends BaseSeeder {
  async run() {
    try {
      // Buscar usuários
      const developer = await User.findBy('email', 'dev@example.com')
      const designer = await User.findBy('email', 'designer@example.com')
      const manager = await User.findBy('email', 'gerente@example.com')

      if (!developer || !designer || !manager) {
        console.error('Usuários não encontrados para criar comentários')
        return
      }

      // Buscar tarefas pelos títulos
      const configTask = await Task.findBy('title', 'Configurar ambiente de desenvolvimento')
      const apiTask = await Task.findBy('title', 'Desenvolver API RESTful')
      const wireframesTask = await Task.findBy('title', 'Criar wireframes')
      const designTask = await Task.findBy('title', 'Design de interface')

      if (!configTask || !apiTask || !wireframesTask || !designTask) {
        console.error('Tarefas não encontradas para criar comentários')
        return
      }

      // Criar comentários para as tarefas
      console.log('Criando comentários para as tarefas')

      // Comentários para a Tarefa 1 (Configurar ambiente)
      await Comment.create({
        content: 'Ambiente configurado com sucesso!',
        task_id: configTask.id,
        user_id: developer.id
      })

      await Comment.create({
        content: 'Tudo funcionando conforme esperado.',
        task_id: configTask.id,
        user_id: manager.id
      })

      // Comentários para a Tarefa 2 (API RESTful)
      await Comment.create({
        content: 'Iniciando o desenvolvimento da API.',
        task_id: apiTask.id,
        user_id: developer.id
      })

      await Comment.create({
        content: 'Endpoints de usuários já estão funcionando.',
        task_id: apiTask.id,
        user_id: developer.id
      })

      // Comentários para a Tarefa 4 (Wireframes)
      await Comment.create({
        content: 'Wireframes aprovados pelo cliente.',
        task_id: wireframesTask.id,
        user_id: designer.id
      })

      // Comentários para a Tarefa 5 (Design de interface)
      await Comment.create({
        content: 'Iniciando o design das páginas principais.',
        task_id: designTask.id,
        user_id: designer.id
      })

      await Comment.create({
        content: 'Por favor, use a paleta de cores aprovada.',
        task_id: designTask.id,
        user_id: manager.id
      })

      console.log('Comentários criados com sucesso')
    } catch (error) {
      console.error('Erro ao criar comentários:', error)
    }
  }
}
