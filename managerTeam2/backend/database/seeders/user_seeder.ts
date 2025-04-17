import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class UserSeeder extends BaseSeeder {
  async run() {
    // Cria usuários de teste com ocupações

    // 1. Administrador - Gerente de Projetos
    const admin = await User.create({
      name: 'Administrador',
      email: 'admin@example.com',
      password: 'password123',
      occupation_id: 4, // Gerente de Projetos
    })

    // 2. Usuário Teste - Analista de Qualidade
    const tester = await User.create({
      name: 'Usuário Teste',
      email: 'user@example.com',
      password: 'password123',
      occupation_id: 5, // Analista de Qualidade
    })

    // 3. Gerente de Projetos - Gerente de Projetos
    const manager = await User.create({
      name: 'Gerente de Projetos',
      email: 'gerente@example.com',
      password: 'password123',
      occupation_id: 4, // Gerente de Projetos
    })

    // 4. Desenvolvedor - Desenvolvedor Backend
    const developer = await User.create({
      name: 'Desenvolvedor',
      email: 'dev@example.com',
      password: 'password123',
      occupation_id: 2, // Desenvolvedor Backend
    })

    // 5. Designer - Designer UI/UX
    const designer = await User.create({
      name: 'Designer',
      email: 'designer@example.com',
      password: 'password123',
      occupation_id: 3, // Designer UI/UX
    })

    // Retorna os usuários criados para uso em outros seeders
    return {
      admin,
      tester,
      manager,
      developer,
      designer
    }
  }
}
