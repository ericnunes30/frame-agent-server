import 'reflect-metadata'
import { Ignitor } from '@adonisjs/core'
import { APP_ROOT } from '@adonisjs/core/helpers'

const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
  })
  .asSingleton()
  .boot()
  .then(async () => {
    const { default: User } = await import('#models/user')
    const users = await User.all()
    
    console.log('Usuários no banco de dados:')
    users.forEach(user => {
      console.log(`ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}`)
    })
    
    process.exit(0)
  })
  .catch((error) => {
    console.error('Erro ao verificar usuários:', error)
    process.exit(1)
  })
