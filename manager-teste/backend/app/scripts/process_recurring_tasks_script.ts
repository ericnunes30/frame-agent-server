import RecurringTask, { ScheduleType } from '#models/recurring_task'
import Task, { Status } from '#models/task'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import cronParser from 'cron-parser'

export default class ProcessRecurringTasksScript {
  public async execute() {
    logger.info('Starting to process recurring tasks...')

    const dueTasks = await RecurringTask.query()
      .where('is_active', true)
      .where('next_due_date', '<=', DateTime.now().toSQL())

    logger.info(`Found ${dueTasks.length} recurring tasks to process.`)

    for (const recurringTask of dueTasks) {
      await this.processSingleTask(recurringTask)
    }

    logger.info('Finished processing recurring tasks.')
  }

  private async processSingleTask(recurringTask: RecurringTask) {
    const trx = await db.transaction()
    try {
      logger.info(`Processing recurring task #${recurringTask.id}`)

      // 1. Criar a nova tarefa usando o template
      const newTask = new Task()
      newTask.useTransaction(trx)

      const { templateData } = recurringTask
      const taskCreationDate = recurringTask.next_due_date

      // Lógica simples para tratar datas relativas ou ISO
      const calculateDate = (dateString: string | undefined, fallback: DateTime) => {
        if (!dateString) return fallback
        const isoDate = DateTime.fromISO(dateString)
        if (isoDate.isValid) return isoDate
        // TODO: Implementar lógica para datas relativas, ex: '+7d'
        return fallback
      }

      newTask.fill({
        title: templateData.title,
        description: templateData.description,
        priority: templateData.priority,
        project_id: recurringTask.projectId,
        recurring_task_id: recurringTask.id,
        status: Status.Backlog,
        start_date: calculateDate(templateData.start_date, taskCreationDate),
        due_date: calculateDate(templateData.due_date, taskCreationDate), // Fallback é o mesmo dia
      })
      await newTask.save()

      // Associar usuários se existirem no template
      if (templateData.assignee_ids) {
        await newTask.related('users').attach(templateData.assignee_ids)
      }

      // Associar ocupações se existirem no template
      if (templateData.occupation_ids && Array.isArray(templateData.occupation_ids)) {
        await newTask.related('occupations').attach(templateData.occupation_ids)
      }

      // 2. Calcular a próxima data de execução e atualizar a tarefa recorrente
      recurringTask.useTransaction(trx)

      let nextDueDateCalculated: DateTime
      const currentBaseDate = recurringTask.next_due_date // Usar a next_due_date atual como base

      if (
        recurringTask.schedule_type === ScheduleType.INTERVAL &&
        recurringTask.frequency_interval
      ) {
        const [valueStr, unit] = recurringTask.frequency_interval.split(' ')
        const value = Number.parseInt(valueStr)

        if (unit.includes('day')) {
          nextDueDateCalculated = currentBaseDate.plus({ days: value })
        } else if (unit.includes('month')) {
          nextDueDateCalculated = currentBaseDate.plus({ months: value })
        } else {
          logger.warn(
            `Unknown interval unit for task #${recurringTask.id}: ${recurringTask.frequency_interval}. Using 7 days fallback.`
          )
          nextDueDateCalculated = currentBaseDate.plus({ days: 7 }) // Fallback
        }
      } else if (
        recurringTask.schedule_type === ScheduleType.CRON &&
        recurringTask.frequency_cron
      ) {
        try {
          // currentBaseDate.toJSDate() converte Luxon para Date, que cron-parser espera
          const interval = cronParser.parseExpression(recurringTask.frequency_cron, {
            currentDate: currentBaseDate.toJSDate(),
          })

          // Calcula a próxima ocorrência após a currentBaseDate
          nextDueDateCalculated = DateTime.fromJSDate(interval.next().toDate())

          // Garante que a próxima data não seja no passado (caso a currentBaseDate já esteja no passado)
          if (nextDueDateCalculated < DateTime.now()) {
            nextDueDateCalculated = DateTime.fromJSDate(interval.next().toDate()) // Pega a próxima, se a primeira for no passado
          }
        } catch (e: any) {
          logger.error(
            `Invalid CRON expression for task #${recurringTask.id}: ${recurringTask.frequency_cron}. Error: ${e.message}`
          )
          nextDueDateCalculated = currentBaseDate.plus({ days: 7 }) // Fallback em caso de erro na CRON
        }
      } else {
        logger.warn(
          `Incomplete schedule type or frequency for task #${recurringTask.id}. Using 7 days fallback.`
        )
        nextDueDateCalculated = currentBaseDate.plus({ days: 7 }) // Fallback geral
      }

      recurringTask.next_due_date = nextDueDateCalculated
      await recurringTask.save()

      await trx.commit()
      logger.info(
        `Successfully processed recurring task #${recurringTask.id}, created task #${newTask.id}`
      )
    } catch (error) {
      await trx.rollback()
      logger.error(`Failed to process recurring task #${recurringTask.id}`)
      logger.error(error)
    }
  }
}
