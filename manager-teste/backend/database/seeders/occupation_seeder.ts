import Occupation from '#models/occupation'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class OccupationSeeder extends BaseSeeder {
  async run() {
    // Limpa as ocupações existentes
    await Occupation.truncate(true)

    // Cria ocupações de teste
    await Occupation.createMany([
      {
        name: 'Desenvolvedor Frontend',
      },
      {
        name: 'Desenvolvedor Backend',
      },
      {
        name: 'Designer UI/UX',
      },
      {
        name: 'Gerente de Projetos',
      },
      {
        name: 'Analista de Qualidade',
      },
    ])
  }
}
