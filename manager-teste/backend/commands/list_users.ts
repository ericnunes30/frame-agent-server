import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'

export default class ListUsers extends BaseCommand {
  static commandName = 'list:users'
  static description = 'Lista todos os usuários no banco de dados'

  async run() {
    const users = await User.all()

    this.logger.info('Usuários no banco de dados:')
    users.forEach((user) => {
      this.logger.info(`ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}`)
    })

    return 0
  }
}
