import vine from '@vinejs/vine'

export const createOccupationValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        projects: vine.array(vine.number()).optional(),
        tasks: vine.array(vine.number()).optional()
    })
)

export const updateOccupationValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        projects: vine.array(vine.number()).optional(),
        tasks: vine.array(vine.number()).optional()
    })
)
