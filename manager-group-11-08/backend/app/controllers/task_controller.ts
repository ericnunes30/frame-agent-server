import type { HttpContext } from '@adonisjs/core/http'

import { createTaskValidator, updateTaskValidator } from '#validators/task'
import Task from '#models/task'
import ActivityLog from '#models/activity_log' // Importar ActivityLog

export default class TasksController {
  async index({}: HttpContext) {
    // Retorna todas as tarefas com seus relacionamentos
    const tasks = await Task.query()
      .preload('project')
      .preload('users')
      .preload('occupations')
      .preload('reviewer')

    // Incluir o campo timer em cada tarefa
    const tasksWithTimer = tasks.map((task) => {
      const taskData = task.toJSON()
      taskData.timer = task.timer || 0
      return taskData
    })

    return tasksWithTimer
  }

  async store({ request, auth }: HttpContext) {
    console.log('🔍 TaskController.store - Raw request body:', request.body())

    const data = await request.validateUsing(createTaskValidator)
    console.log('🔍 TaskController.store - Validated data:', data)

    const {
      title,
      description,
      priority,
      status,
      start_date,
      due_date,
      project_id,
      order,
      timer,
      task_reviewer_id,
      video_url,
      useful_links,
      observations,
      has_detailed_fields,
      users,
      occupations,
    } = data

    console.log('🔍 TaskController.store - Extracted fields:')
    console.log('  - has_detailed_fields:', has_detailed_fields)
    console.log('  - video_url:', video_url)
    console.log('  - useful_links:', useful_links)
    console.log('  - observations:', observations)

    const taskCreateData = {
      title,
      description,
      priority,
      status,
      start_date,
      due_date,
      project_id,
      order,
      timer: timer || 0,
      task_reviewer_id,
      video_url,
      useful_links: useful_links ? JSON.stringify(useful_links) : null,
      observations,
      has_detailed_fields: has_detailed_fields || false,
    }

    console.log('🔍 TaskController.store - Task create data:', taskCreateData)

    const task = await Task.create(taskCreateData as any)
    console.log('🔍 TaskController.store - Task created successfully with ID:', task.id)
    console.log('🔍 TaskController.store - Created task data:', task.toJSON())

    if (users && users.length > 0) {
      await task.related('users').attach(users)
    } else {
      // Attach current user if no users specified
      await task.related('users').attach([auth.user!.id])
    }

    if (occupations && occupations.length > 0) {
      await task.related('occupations').attach(occupations)
    }

    // Refresh the task instance to ensure date fields are DateTime objects
    await task.refresh()

    // Logging task creation and initial assignee setup
    const actingUserId = auth.user!.id
    const createdTaskId = task.id

    // Log: Task Created
    // Ensure all fields for details are actually present on the task object or handle potential null/undefined
    await ActivityLog.create({
      userId: actingUserId,
      taskId: createdTaskId,
      actionType: 'TASK_CREATED',
      details: {
        title: task.title,
        description: task.description ?? null, // Handle potential null
        priority: task.priority,
        status: task.status,
        project_id: task.project_id,
        start_date: task.start_date ? task.start_date.toISODate() : null,
        due_date: task.due_date ? task.due_date.toISODate() : null,
      },
    })

    // Determine final list of assigned user IDs for logging
    // We need to fetch the actual users attached to the task to be certain
    await task.load('users')
    const finalAssignedUserIds = task.users.map((u) => u.id)

    // Log: Task Assignees Set
    if (finalAssignedUserIds.length > 0) {
      await ActivityLog.create({
        userId: actingUserId,
        taskId: createdTaskId,
        actionType: 'TASK_ASSIGNEES_SET',
        changedField: 'users',
        newValue: JSON.stringify(finalAssignedUserIds.sort()), // Sort for consistent logging
      })
    }

    console.log('🚀 TaskController.store - Final task object before return:', task.toJSON())
    return task
  }

  async show({ params, response }: HttpContext) {
    try {
      console.log(
        `TasksController.show - Attempting to find task with params.id: ${params.id} (Type: ${typeof params.id})`
      )
      const task = await Task.findByOrFail('id', params.id)
      await task.load('project')
      await task.load('users')
      await task.load('occupations')
      await task.load('reviewer')

      // Carregar comentários de nível superior
      await task.load('comments', (commentsQuery) => {
        commentsQuery
          .whereNull('parent_id') // Apenas comentários de nível superior
          .preload('user') // Usuário do comentário principal
          .preload('mentionedUsers') // Menções no comentário principal
          .preload('replies', (repliesQuery) => {
            // Pré-carrega as respostas diretas
            repliesQuery
              .preload('user') // Usuário da resposta
              .preload('mentionedUsers') // Menções na resposta
              // Não precisamos de .withCount('replies') para as respostas, pois é apenas 1 nível de aninhamento
              .orderBy('created_at', 'asc') // Ordena as respostas
          })
          // .withCount('replies', (queryBuilder) => queryBuilder.as('repliesCount')) // Conta as respostas diretas do comentário principal
          .orderBy('created_at', 'desc') // Ordena os comentários principais
      })

      // Incluir o campo timer na resposta
      const taskData = task.toJSON()
      taskData.timer = task.timer || 0
      // Os comentários carregados (com repliesCount) já estarão em taskData.comments

      return taskData
    } catch (error) {
      console.error(
        `TasksController.show - Error finding task with params.id: ${params.id}:`,
        error
      )
      return response.status(400).json({ error: 'Task not found!' })
    }
  }

  async update({ request, params, response, auth }: HttpContext) {
    // 1. Adicionar auth
    try {
      console.log('🔍 TaskController.update - Raw request body:', request.body())
      const actingUserId = auth.user!.id // 2. Definir actingUserId
      const taskId = params.id

      // 3. Buscar o estado original da tarefa ANTES de qualquer modificação
      const task = await Task.findByOrFail('id', taskId)
      await task.load('users') // Carregar usuários para obter a lista original

      const originalTaskState = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        start_date: task.start_date ? task.start_date.toISODate() : null,
        due_date: task.due_date ? task.due_date.toISODate() : null,
        project_id: task.project_id,
        video_url: task.video_url,
        useful_links: task.useful_links,
        observations: task.observations,
        has_detailed_fields: task.has_detailed_fields,
      }
      const originalUserIds = task.users.map((u) => u.id).sort()
      // Neste ponto, 'task' ainda é a instância original.
      // 'originalTaskState' e 'originalUserIds' guardam os valores antes da validação e do merge.
      const data = await request.validateUsing(updateTaskValidator)
      console.log('🔍 TaskController.update - Validated data:', data)

      task.merge(data as any)
      console.log('🔍 TaskController.update - Task after merge:', task.toJSON())
      await task.save()

      if (data.users && data.users.length > 0) {
        await task.related('users').sync(data.users)
      }

      if (data.occupations && data.occupations.length > 0) {
        await task.related('occupations').sync(data.occupations)
      }

      // Recarregar a tarefa com seus relacionamentos para obter o estado final
      await task.refresh() // Ensures `task` has the latest data from DB for direct fields
      await task.load('project') // Keep for response consistency
      await task.load('users') // Load users again to get the state after potential sync
      await task.load('occupations') // Keep for response consistency
      await task.load('reviewer')

      // 4. Compare and Log changes
      const updatedTaskState = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        start_date: task.start_date ? task.start_date.toISODate() : null,
        due_date: task.due_date ? task.due_date.toISODate() : null,
        project_id: task.project_id,
        video_url: task.video_url,
        useful_links: task.useful_links,
        observations: task.observations,
        has_detailed_fields: task.has_detailed_fields,
      }
      const updatedUserIds = task.users.map((u) => u.id).sort()

      const fieldsToLog: Array<{ key: keyof typeof originalTaskState; name?: string }> = [
        { key: 'title' },
        { key: 'description' },
        { key: 'priority' },
        { key: 'status' },
        { key: 'start_date' },
        { key: 'due_date' },
        { key: 'project_id' },
        { key: 'video_url' },
        { key: 'useful_links' },
        { key: 'observations' },
        { key: 'has_detailed_fields' },
      ]

      for (const field of fieldsToLog) {
        const oldValue = originalTaskState[field.key]
        const newValue = updatedTaskState[field.key]

        if (String(oldValue ?? '') !== String(newValue ?? '')) {
          await ActivityLog.create({
            userId: actingUserId,
            taskId: task.id,
            actionType: `TASK_${String(field.key).toUpperCase()}_UPDATED`, // Garantir que field.key é string
            changedField: String(field.key), // Garantir que field.key é string
            oldValue: oldValue !== null ? String(oldValue) : null,
            newValue: newValue !== null ? String(newValue) : null,
          })
        }
      }

      // Compare and log user changes (assignees)
      if (JSON.stringify(originalUserIds) !== JSON.stringify(updatedUserIds)) {
        await ActivityLog.create({
          userId: actingUserId,
          taskId: task.id,
          actionType: 'TASK_ASSIGNEES_UPDATED',
          changedField: 'users',
          oldValue: JSON.stringify(originalUserIds),
          newValue: JSON.stringify(updatedUserIds),
        })
      }

      // Log para depuração (pode ser removido em produção)
      console.log('Tarefa atualizada e logs gerados (se houveram mudanças):', task.toJSON())

      // Preparar dados de resposta
      const responseData = task.toJSON()
      responseData.timer = task.timer || 0 // Manter a lógica do timer

      return responseData
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      return response.status(400).json({ error: 'Task not found!' })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const task = await Task.findByOrFail('id', params.id)
      await task.delete()
      return response.status(203)
    } catch (error) {
      return response.status(400).json({ error: 'Task not found!' })
    }
  }

  // Novo método para buscar o hist��rico de uma tarefa
  async getHistory({ params, request, response }: HttpContext) {
    try {
      const taskId = params.taskId

      // 1. Valida se a tarefa existe
      await Task.findOrFail(taskId)

      // 2. Busca os logs de atividade para esta tarefa, paginados
      const page = request.input('page', 1)
      const limit = request.input('limit', 20) // Limite padrão maior para histórico?

      const activityLogs = await ActivityLog.query()
        .where('task_id', taskId)
        .preload('user') // Carrega o usuário que realizou a ação (se houver)
        .orderBy('created_at', 'desc') // Histórico geralmente do mais recente para o mais antigo
        .paginate(page, limit)

      return activityLogs
    } catch (error) {
      if (error.code === 'E_ROW_NOT_FOUND') {
        // Se a tarefa não foi encontrada
        return response.status(404).json({ error: 'Task not found' })
      }
      // Usar um helper genérico para outros erros (poderia ser definido aqui ou importado)
      console.error('Erro ao buscar histórico da tarefa:', error)
      return response.status(500).json({ error: 'An unexpected error occurred on the server.' })
    }
  }
}
