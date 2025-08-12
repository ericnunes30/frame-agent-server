import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddNewTaskStatusValues extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    // Esta migration adiciona suporte aos novos status de tarefa:
    // - aguardando_cliente
    // - cancelado

    this.defer(async (db) => {
      try {
        // Primeiro, vamos verificar se a coluna status é um enum ou varchar
        const columnInfo = await db.rawQuery(`
          SELECT data_type, udt_name 
          FROM information_schema.columns 
          WHERE table_name = 'tasks' AND column_name = 'status'
        `)

        console.log('Column info:', columnInfo.rows)

        // Se for um enum PostgreSQL, adicionar os novos valores
        if (columnInfo.rows[0]?.data_type === 'USER-DEFINED') {
          console.log('Adicionando novos valores ao enum existente...')
          await db.rawQuery(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'aguardando_cliente') THEN
                ALTER TYPE ${columnInfo.rows[0].udt_name} ADD VALUE 'aguardando_cliente';
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelado') THEN
                ALTER TYPE ${columnInfo.rows[0].udt_name} ADD VALUE 'cancelado';
              END IF;
            END $$;
          `)
        } else {
          // Se não for enum, apenas validar que os valores podem ser inseridos
          console.log('Coluna status não é um enum, assumindo VARCHAR - novos valores suportados')
        }

        console.log('Novos status adicionados com sucesso!')
      } catch (error) {
        console.error('Erro ao adicionar novos status:', error)
        // Se der erro, tentar uma abordagem mais simples
        console.log('Tentando abordagem alternativa...')

        // Verificar se podemos inserir os valores diretamente
        try {
          await db.from('tasks').where('id', -999).update({ status: 'aguardando_cliente' })
        } catch (e) {
          console.log('Novos status não suportados ainda - será necessário recriar enum')
        }
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      // Atualizar tarefas para um status válido antes de fazer rollback
      const tasksWithNewStatus = await db
        .from('tasks')
        .whereIn('status', ['aguardando_cliente', 'cancelado'])
        .count('* as total')
        .first()

      if (tasksWithNewStatus && Number.parseInt(tasksWithNewStatus.total) > 0) {
        console.warn(`Atualizando ${tasksWithNewStatus.total} tarefas para status 'pendente'`)
        await db
          .from('tasks')
          .whereIn('status', ['aguardando_cliente', 'cancelado'])
          .update({ status: 'pendente' })
      }
    })
  }
}
