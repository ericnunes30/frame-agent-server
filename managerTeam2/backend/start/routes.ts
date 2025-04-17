import auth from '@adonisjs/auth/services/main'
import router from '@adonisjs/core/services/router'

import { middleware } from './kernel.js'

import UsersController from '#controllers/user_controller'
import TasksController from '#controllers/task_controller'
import CommentsController from '#controllers/comment_controller'
import OccupationsController from '#controllers/occupation_controller'
import ProjectsController from '#controllers/project_controller'
import RolesController from '#controllers/role_controller'
import SessionController from '#controllers/session_controller'

router.post('session', [SessionController, 'store'])

router.resource('user', UsersController).apiOnly()

router.group(() => {
    router.resource('task', TasksController).apiOnly()
    router.resource('comment', CommentsController).apiOnly()
    router.resource('occupation', OccupationsController).apiOnly()
    router.resource('project', ProjectsController).apiOnly()
    router.resource('role', RolesController).apiOnly()
}).use(middleware.auth())
