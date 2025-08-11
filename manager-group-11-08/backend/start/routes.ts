import router from '@adonisjs/core/services/router'

import { middleware } from './kernel.js'

const UsersController = () => import('#controllers/user_controller')
const TasksController = () => import('#controllers/task_controller')
const CommentsController = () => import('#controllers/comment_controller')
const OccupationsController = () => import('#controllers/occupation_controller')
const ProjectsController = () => import('#controllers/project_controller')
const RolesController = () => import('#controllers/role_controller')
const SessionController = () => import('#controllers/session_controller')
const RecurringTasksController = () => import('#controllers/recurring_task_controller')

router.post('session', [SessionController, 'store'])

// Linha removida, a rota será definida dentro do grupo abaixo
router
  .group(() => {
    router.resource('task', TasksController).apiOnly()
    router.get('/task/:taskId/history', [TasksController, 'getHistory']).as('tasks.history') // Rota para histórico da tarefa
    // Rotas espec��ficas para comentários devem vir antes do resource genérico
    router.get('/comment/task/:taskId', [CommentsController, 'findByTask'])
    router.get('/comment/:commentId/replies', [CommentsController, 'findReplies']) // Rota para buscar respostas
    router.post('/comment/:commentId/like', [CommentsController, 'addLike']).as('comments.like') // Rota para curtir
    router
      .delete('/comment/:commentId/like', [CommentsController, 'removeLike'])
      .as('comments.unlike') // Rota para descurtir
    router.resource('comment', CommentsController).apiOnly()
    router.resource('occupation', OccupationsController).apiOnly()
    router.resource('project', ProjectsController).apiOnly()
    router.resource('role', RolesController).apiOnly()
    router.resource('recurring-task', RecurringTasksController).apiOnly()
    router.resource('user', UsersController).apiOnly()
  })
  .use(middleware.auth())
