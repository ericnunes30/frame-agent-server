import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Occupation from '#models/occupation'
import Project from '#models/project'

export default class OccupationsProjectsSeeder extends BaseSeeder {
  async run() {
    // Buscar ocupações
    const frontendDev = await Occupation.findBy('name', 'Desenvolvedor Frontend')
    const backendDev = await Occupation.findBy('name', 'Desenvolvedor Backend')
    const designer = await Occupation.findBy('name', 'Designer UI/UX')
    const projectManager = await Occupation.findBy('name', 'Gerente de Projetos')

    // Buscar projetos
    const taskManagement = await Project.findBy('title', 'Sistema de Gerenciamento de Tarefas')
    const websiteRedesign = await Project.findBy('title', 'Redesign do Site Institucional')
    const mobileApp = await Project.findBy('title', 'Aplicativo Mobile')

    // Associar ocupações a projetos
    if (taskManagement) {
      const taskManagementOccupations = []
      if (backendDev) taskManagementOccupations.push(backendDev.id)
      if (projectManager) taskManagementOccupations.push(projectManager.id)

      if (taskManagementOccupations.length > 0) {
        await taskManagement.related('occupations').attach(taskManagementOccupations)
      }
    }

    if (websiteRedesign) {
      const websiteRedesignOccupations = []
      if (frontendDev) websiteRedesignOccupations.push(frontendDev.id)
      if (designer) websiteRedesignOccupations.push(designer.id)
      if (projectManager) websiteRedesignOccupations.push(projectManager.id)

      if (websiteRedesignOccupations.length > 0) {
        await websiteRedesign.related('occupations').attach(websiteRedesignOccupations)
      }
    }

    if (mobileApp) {
      const mobileAppOccupations = []
      if (frontendDev) mobileAppOccupations.push(frontendDev.id)
      if (backendDev) mobileAppOccupations.push(backendDev.id)
      if (designer) mobileAppOccupations.push(designer.id)
      if (projectManager) mobileAppOccupations.push(projectManager.id)

      if (mobileAppOccupations.length > 0) {
        await mobileApp.related('occupations').attach(mobileAppOccupations)
      }
    }
  }
}
