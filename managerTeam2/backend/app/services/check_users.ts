import User from '#models/user'

export async function checkUsers() {
  const users = await User.all()
  console.log('Usuários no banco de dados:')
  users.forEach(user => {
    console.log(`ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}`)
  })
}
