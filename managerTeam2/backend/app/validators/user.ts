import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        email: vine
        .string()
        .email()
        .normalizeEmail()
        .unique(async (db, value) => {
            const match = await db.from('users').select('id').where('email', value).first()
            return !match
        }),
        password: vine.string().minLength(6),
        occupation_id: vine.number().optional(),
        occupations: vine.array(vine.number()).optional(),
        roles: vine.array(vine.number()).optional()
    })
)

export const updateUserValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        password: vine.string().minLength(6).optional(),
        occupation_id: vine.number().optional(),
        occupations: vine.array(vine.number()).optional(),
        roles: vine.array(vine.number()).optional()
    })
)
