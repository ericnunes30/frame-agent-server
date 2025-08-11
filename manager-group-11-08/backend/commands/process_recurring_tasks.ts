import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import ProcessRecurringTasksScript from '#scripts/process_recurring_tasks_script'

export default class ProcessRecurringTasks extends BaseCommand {
  static commandName = 'process:recurring-tasks'
  static description = 'Process due recurring tasks and create new tasks from templates'

  static options: CommandOptions = {}

  public async run() {
    const script = new ProcessRecurringTasksScript()
    await script.execute()
  }
}
