import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class MainSeeder extends BaseSeeder {
  async run() {
    try {
      // Limpar todas as tabelas
      await this.client.rawQuery('TRUNCATE TABLE roles CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE occupations CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE projects CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE users CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE tasks CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE comments CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE users_roles CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE projects_users CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE occupations_projects CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE task_user CASCADE')
      await this.client.rawQuery('TRUNCATE TABLE occupations_tasks CASCADE')

      // 1. Importa e executa o RoleSeeder
      const { default: RoleSeeder } = await import('#database/seeders/role_seeder')
      await new RoleSeeder(this.client).run()
      console.log('Roles criadas com sucesso!')

      // 2. Importa e executa o OccupationSeeder
      const { default: OccupationSeeder } = await import('#database/seeders/occupation_seeder')
      await new OccupationSeeder(this.client).run()
      console.log('Ocupações criadas com sucesso!')

      // 3. Importa e executa o UserSeeder
      const { default: UserSeeder } = await import('#database/seeders/user_seeder')
      await new UserSeeder(this.client).run()
      console.log('Usuários criados com sucesso!')

      // 4. Importa e executa o UsersRolesSeeder
      const { default: UsersRolesSeeder } = await import('#database/seeders/users_roles_seeder')
      await new UsersRolesSeeder(this.client).run()
      console.log('Associações entre usuários e funções criadas com sucesso!')

      // 5. Importa e executa o ProjectSeeder
      const { default: ProjectSeeder } = await import('#database/seeders/project_seeder')
      await new ProjectSeeder(this.client).run()
      console.log('Projetos criados com sucesso!')

      // 6. Importa e executa o OccupationsProjectsSeeder
      const { default: OccupationsProjectsSeeder } = await import(
        '#database/seeders/occupations_projects_seeder'
      )
      await new OccupationsProjectsSeeder(this.client).run()
      console.log('Associações entre ocupações e projetos criadas com sucesso!')

      // 7. Importa e executa o ProjectsUsersSeeder
      const { default: ProjectsUsersSeeder } = await import(
        '#database/seeders/projects_users_seeder'
      )
      await new ProjectsUsersSeeder(this.client).run()
      console.log('Associações entre projetos e usuários criadas com sucesso!')

      // 8. Importa e executa o TaskSeeder
      const { default: TaskSeeder } = await import('#database/seeders/task_seeder')
      await new TaskSeeder(this.client).run()
      console.log('Tarefas criadas com sucesso!')

      // 9. Importa e executa o TasksUsersSeeder
      const { default: TasksUsersSeeder } = await import('#database/seeders/tasks_users_seeder')
      await new TasksUsersSeeder(this.client).run()
      console.log('Associações entre tarefas e usuários criadas com sucesso!')

      // 10. Importa e executa o OccupationsTasksSeeder
      const { default: OccupationsTasksSeeder } = await import(
        '#database/seeders/occupations_tasks_seeder'
      )
      await new OccupationsTasksSeeder(this.client).run()
      console.log('Associações entre ocupações e tarefas criadas com sucesso!')

      // 11. Importa e executa o CommentSeeder
      const { default: CommentSeeder } = await import('#database/seeders/comment_seeder')
      await new CommentSeeder(this.client).run()
      console.log('Comentários criados com sucesso!')
    } catch (error) {
      console.error('Erro ao executar seeders:', error)
    }
  }
}
