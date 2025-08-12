import { BaseSchema } from '@adonisjs/lucid/schema'

// Definições de Enum diretamente para evitar problemas de importação na consolidação
const ProjectPriorityLevel = { Low: 'baixa', Medium: 'media', High: 'alta', Urgent: 'urgente' }
const TaskPriorityLevel = { Low: 'baixa', Medium: 'media', High: 'alta', Urgent: 'urgente' }
const TaskStatus = {
  Backlog: 'pendente',
  ToDo: 'a_fazer',
  InProgress: 'em_andamento',
  Review: 'em_revisao',
  WaitingClient: 'aguardando_cliente',
  Done: 'concluido',
  Cancelled: 'cancelado',
}

export default class ConsolidatedInitialSchema extends BaseSchema {
  async up() {
    // --- 001_create_roles_table.ts ---
    this.schema.createTable('roles', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.text('description').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // --- 002_create_occupations_table.ts ---
    this.schema.createTable('occupations', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // --- 003_create_projects_table.ts ---
    this.schema.createTable('projects', (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.text('description').nullable()
      table.boolean('status').notNullable().defaultTo(false)
      table.enum('priority', Object.values(ProjectPriorityLevel)).notNullable()
      table.dateTime('start_date').notNullable()
      table.dateTime('end_date').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // --- 004_create_users_table.ts ---
    this.schema.createTable('users', (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.string('token').nullable()
      table.integer('occupation_id').nullable().unsigned().references('id').inTable('occupations')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // --- 005_create_tasks_table.ts ---
    this.schema.createTable('tasks', (table) => {
      table.increments('id')
      table.integer('order').nullable()
      table.string('title').notNullable()
      table.text('description').nullable()
      table.enum('priority', Object.values(TaskPriorityLevel)).notNullable()
      table.enum('status', Object.values(TaskStatus)).notNullable()
      table.dateTime('start_date').notNullable()
      table.dateTime('due_date').notNullable()
      table.integer('project_id').nullable().unsigned().references('id').inTable('projects')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // --- 006_create_access_tokens_table.ts ---
    this.schema.createTable('auth_access_tokens', (table) => {
      table.increments('id')
      table
        .integer('tokenable_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
    })

    // --- 007_create_comments_table.ts (Criação Inicial) ---
    this.schema.createTable('comments', (table) => {
      table.increments('id')
      table.text('content').notNullable()
      table
        .integer('task_id')
        .nullable()
        .unsigned()
        .references('id')
        .inTable('tasks')
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .nullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onUpdate('CASCADE')
        .onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // --- 008_create_occupations_projects_table.ts ---
    this.schema.createTable('occupations_projects', (table) => {
      table
        .integer('occupation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('occupations')
        .onDelete('CASCADE')
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
      table.primary(['occupation_id', 'project_id'])
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // --- 009_create_occupations_tasks_table.ts ---
    this.schema.createTable('occupations_tasks', (table) => {
      table
        .integer('occupation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('occupations')
        .onDelete('CASCADE')
      table
        .integer('task_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')
      table.primary(['occupation_id', 'task_id'])
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // --- 010_create_projects_users_table.ts ---
    this.schema.createTable('projects_users', (table) => {
      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.primary(['project_id', 'user_id'])
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // --- 011_create_task_users_table.ts ---
    this.schema.createTable('task_user', (table) => {
      table
        .integer('task_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.primary(['task_id', 'user_id'])
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // --- 012_create_users_roles_table.ts ---
    this.schema.createTable('users_roles', (table) => {
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('role_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('roles')
        .onDelete('CASCADE')
      table.primary(['user_id', 'role_id'])
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // --- 013_add_user_id_to_roles_table.ts ---
    this.schema.alterTable('roles', (table) => {
      table.integer('user_id').unsigned().references('id').inTable('users')
    })

    // --- 014_add_user_id_to_occupations_table.ts ---
    this.schema.alterTable('occupations', (table) => {
      table.integer('user_id').unsigned().references('id').inTable('users')
    })

    // --- 015_add_task_id_to_projects_table.ts (VAZIA) ---
    // Nada a fazer

    // --- 1744735683719_create_create_users_occupations_table.ts ---
    this.schema.createTable('users_occupations', (table) => {
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('occupation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('occupations')
        .onDelete('CASCADE')
      table.primary(['user_id', 'occupation_id'])
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
    })

    // --- 1746407672204_create_add_timer_to_tasks_table.ts ---
    this.schema.alterTable('tasks', (table) => {
      table.integer('timer').defaultTo(0).notNullable()
    })

    // --- Lógica da 1746652178415_create_add_fields_to_comments_and_create_mentions_pivots_table.ts ---
    this.schema.alterTable('comments', (table) => {
      table
        .integer('parent_id')
        .unsigned()
        .references('id')
        .inTable('comments')
        .onDelete('SET NULL')
        .nullable()
      table.integer('likes_count').notNullable().defaultTo(0)
    })
    this.schema.createTable('comment_user_mentions', (table) => {
      table.increments('id').primary()
      table
        .integer('comment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('comments')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.unique(['comment_id', 'user_id'])
    })

    // --- 1746653114177_create_create_comment_likes_table.ts ---
    this.schema.createTable('comment_likes', (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()
      table
        .integer('comment_id')
        .unsigned()
        .references('id')
        .inTable('comments')
        .onDelete('CASCADE')
        .notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.unique(['user_id', 'comment_id'])
    })

    // --- 1746655040923_create_create_activity_logs_table.ts ---
    this.schema.createTable('activity_logs', (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
      table
        .integer('task_id')
        .unsigned()
        .references('id')
        .inTable('tasks')
        .onDelete('CASCADE')
        .nullable()
      table.string('action_type').notNullable()
      table.string('changed_field').nullable()
      table.text('old_value').nullable()
      table.text('new_value').nullable()
      table.integer('reference_id').nullable()
      table.json('details').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    // A ordem de drop é crucial: do mais dependente para o menos dependente (inverso do up)
    this.schema.dropTableIfExists('activity_logs')
    this.schema.dropTableIfExists('comment_likes')
    this.schema.dropTableIfExists('comment_user_mentions')

    this.schema.alterTable('comments', (table) => {
      if (this.db.dialect.name !== 'sqlite3') {
        try {
          table.dropForeign(['parent_id'])
        } catch (e) {
          console.warn(
            'Could not drop parent_id FK from comments, it might not exist or have a different name.'
          )
        }
      }
      table.dropColumn('parent_id')
      table.dropColumn('likes_count')
    })

    this.schema.alterTable('tasks', (table) => {
      table.dropColumn('timer')
    })

    this.schema.dropTableIfExists('users_occupations')

    this.schema.alterTable('occupations', (table) => {
      if (this.db.dialect.name !== 'sqlite3') {
        try {
          table.dropForeign(['user_id'])
        } catch (e) {
          console.warn(
            'Could not drop user_id FK from occupations, it might not exist or have a different name.'
          )
        }
      }
      table.dropColumn('user_id')
    })

    this.schema.alterTable('roles', (table) => {
      if (this.db.dialect.name !== 'sqlite3') {
        try {
          table.dropForeign(['user_id'])
        } catch (e) {
          console.warn(
            'Could not drop user_id FK from roles, it might not exist or have a different name.'
          )
        }
      }
      table.dropColumn('user_id')
    })

    this.schema.dropTableIfExists('users_roles')
    this.schema.dropTableIfExists('task_user')
    this.schema.dropTableIfExists('projects_users')
    this.schema.dropTableIfExists('occupations_tasks')
    this.schema.dropTableIfExists('occupations_projects')
    this.schema.dropTableIfExists('comments')
    this.schema.dropTableIfExists('auth_access_tokens')
    this.schema.dropTableIfExists('tasks')
    this.schema.dropTableIfExists('users')
    this.schema.dropTableIfExists('projects')
    this.schema.dropTableIfExists('occupations')
    this.schema.dropTableIfExists('roles')
  }
}
