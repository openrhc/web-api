import { Router } from 'express'

const router = Router()

router.get('/', (req, res, next) => {
    res.json({code: 0, msg: ''})
})

export default router
