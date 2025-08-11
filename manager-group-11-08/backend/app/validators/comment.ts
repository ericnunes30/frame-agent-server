import vine from '@vinejs/vine'

export const createCommentValidator = vine.compile(
  vine.object({
    content: vine.string().trim(),
    task_id: vine.number(),
    parentId: vine.number().optional(), // Adicionado parentId como opcional
  })
)

export const updateCommentValidator = vine.compile(
  vine.object({
    content: vine.string().trim(),
  })
)
