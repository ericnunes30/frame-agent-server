import type { HttpContext } from '@adonisjs/core/http'
import { createSessionValidator } from '#validators/session'
import User from '#models/user'

export default class SessionController {
  async store({ request }: HttpContext) {
    try {
      const { email, password } = await request.validateUsing(createSessionValidator)
      const user = await User.verifyCredentials(email, password)
      const tokenData = await User.accessTokens.create(user)

      // Convertendo para JSON para acessar o token
      const tokenJson = tokenData.toJSON() as {
        type: string
        name: string | null
        token: string | undefined
        abilities: string[]
        lastUsedAt: Date | null
        expiresAt: Date | null
      }

      // Simplificando a resposta para incluir apenas o token, user_id e name
      const response = {
        token: tokenJson.token,
        user_id: user.id,
        name: user.name,
      }

      console.log('Session response with user_id:', response)

      return response
    } catch (err: any) {
      console.error('Error in session store:', err)
      return {
        error: err.message,
      }
    }
  }

  async destroy({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
      return response.status(203).json({ message: 'Logout realizado com sucesso' })
    } catch (err: any) {
      console.error('Error in session destroy:', err)
      return response.status(400).json({
        error: err.message,
      })
    }
  }
}
