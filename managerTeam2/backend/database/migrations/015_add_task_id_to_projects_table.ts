import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    // Removendo a referência circular entre projects e tasks
    // Um projeto pode ter muitas tarefas, mas uma tarefa pertence a um projeto
    // Não faz sentido um projeto referenciar uma tarefa específica
  }

  async down() {
    // Nada a fazer aqui
  }
}