import { BaseCommand } from '@adonisjs/core/ace'

export default class CheckUsers extends BaseCommand {
  static commandName = 'check:users'
  static description = 'Verifica os usuários no banco de dados'

  async run() {
    return 0
  }
}
