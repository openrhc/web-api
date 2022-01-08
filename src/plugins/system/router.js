import { Router } from 'express'
import * as utils from './utils.js'

const router = Router()

router.get('/status', (req, res, next) => {
    const data = utils.getStatus()
    res.json({ code: 0, data })
})

router.get('/traffic', async (req, res, next) => {
    const [err, traffic] = await utils.getTraffic()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, traffic })
})

export default router
