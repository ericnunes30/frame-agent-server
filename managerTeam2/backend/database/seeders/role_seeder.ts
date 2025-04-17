import Role from '#models/role'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class RoleSeeder extends BaseSeeder {
  async run() {
    try {
      // Limpar funções existentes
      await this.client.rawQuery('TRUNCATE TABLE roles CASCADE')

      console.log('Criando funções...')

      // Cria funções de teste
      await Role.createMany([
        {
          name: 'Administrador',
          description: 'Acesso total ao sistema',
        },
        {
          name: 'Gerente',
          description: 'Gerencia projetos e equipes',
        },
        {
          name: 'Membro',
          description: 'Membro da equipe com acesso básico',
        },
        {
          name: 'Convidado',
          description: 'Acesso limitado apenas para visualização',
        }
      ])

      console.log('Funções criadas com sucesso!')
    } catch (error) {
      console.error('Erro ao criar funções:', error)

      // Tenta inserir diretamente no banco de dados
      try {
        await this.client.rawQuery(
          "INSERT INTO roles (name, description) VALUES ('Administrador', 'Acesso total ao sistema'), ('Gerente', 'Gerencia projetos e equipes'), ('Membro', 'Membro da equipe com acesso básico'), ('Convidado', 'Acesso limitado apenas para visualização')"
        )
        console.log('Funções criadas com sucesso via SQL!')
      } catch (sqlError) {
        console.error('Erro ao criar funções via SQL:', sqlError)
      }
    }
  }
}
