import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddDetailedFieldsToTasks extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('video_url').nullable().comment('URL do vídeo do YouTube')
      table
        .json('useful_links')
        .nullable()
        .comment('Array de objetos com {title, url} para links úteis')
      table.text('observations').nullable().comment('Observações detalhadas da tarefa')
      table
        .boolean('has_detailed_fields')
        .defaultTo(false)
        .comment('Flag para indicar se a tarefa possui campos detalhados')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('video_url')
      table.dropColumn('useful_links')
      table.dropColumn('observations')
      table.dropColumn('has_detailed_fields')
    })
  }
}
