import { BaseSchema } from '@adonisjs/lucid/schema'
import { PriorityLevel, Status } from '../../app/models/task.js' 

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('order').nullable()
      table.string('title').notNullable()
      table.text('description').nullable()
      
      table.enum('priority', Object.values(PriorityLevel)).notNullable()
      table.enum('status', Object.values(Status)).notNullable()

      table.dateTime('start_date').notNullable() 
      table.dateTime('due_date').notNullable()  
      
      table.integer('project_id').notNullable().unsigned().references('id').inTable('projects')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}