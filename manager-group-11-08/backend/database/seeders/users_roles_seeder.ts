import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Role from '#models/role'

export default class UsersRolesSeeder extends BaseSeeder {
  async run() {
    // Buscar usuários
    const admin = await User.findBy('email', 'admin@example.com')
    const tester = await User.findBy('email', 'user@example.com')
    const manager = await User.findBy('email', 'gerente@example.com')
    const developer = await User.findBy('email', 'dev@example.com')
    const designer = await User.findBy('email', 'designer@example.com')

    // Buscar funções
    const adminRole = await Role.findBy('name', 'Administrador')
    const managerRole = await Role.findBy('name', 'Gerente')
    const memberRole = await Role.findBy('name', 'Membro')
    const guestRole = await Role.findBy('name', 'Convidado')

    // Associar usuários a funções
    if (admin && adminRole) {
      await admin.related('roles').attach([adminRole.id])
    }

    if (manager && managerRole) {
      await manager.related('roles').attach([managerRole.id])
    }

    if (developer && memberRole) {
      await developer.related('roles').attach([memberRole.id])
    }

    if (designer && memberRole) {
      await designer.related('roles').attach([memberRole.id])
    }

    if (tester && guestRole) {
      await tester.related('roles').attach([guestRole.id])
    }
  }
}
