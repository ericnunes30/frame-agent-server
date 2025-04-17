import type { HttpContext } from '@adonisjs/core/http'

import { createCommentValidator, updateCommentValidator } from '#validators/comment'
import Comment from '#models/comment'

export default class CommentsController {
    async index({ auth }: HttpContext) {
        const user = auth.user!
        await user.load('comments')
        return user.comments
    }

    async store({ request, auth }: HttpContext) {
        const { content, task_id } = await request.validateUsing(createCommentValidator)
        const user = auth.user!

        const comment = await Comment.create({
            content,
            task_id,
            userId: user.id
        })

        return comment
    }

    async show({ params, response }: HttpContext) {
        try {
            const comment = await Comment.findByOrFail('id', params.id)
            await comment.load('task')
            await comment.load('user')
            return comment
        } catch (error) {
            return response.status(400).json({error: "Comment not found!"})
        }
    }

    async update({ request, params, response }: HttpContext) {
        try {
            const comment = await Comment.findByOrFail('id', params.id)
            const { content } = await request.validateUsing(updateCommentValidator)

            comment.merge({ content })
            await comment.save()

            return comment
        } catch (error) {
            return response.status(400).json({error: "Comment not found!"})
        }
    }

    async destroy({ params, response }: HttpContext) {
        try {
            const comment = await Comment.findByOrFail('id', params.id)
            await comment.delete()
            return response.status(203)
        } catch (error) {
            return response.status(400).json({error: "Comment not found!"})
        }
    }
}
