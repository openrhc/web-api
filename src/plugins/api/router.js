import { Router } from 'express'

import * as system from '../system/utils.js'

const router = Router()

router.get('/status', async (req, res, next) => {
    const status = system.getStatus()
    const [res1, res2] = await Promise.all([system.getTraffic(), system.getSystemMem()])
    if (res1[0] && res2[0]) {
        return res.json({
            code: -1,
            msg: res1[0].message + res2[0].message
        })
    }
    res.json({
        code: 0,
        data: {
            status,
            traffic: res1[1],
            mem: res2[1]
        }
    })
})

router.get('/traffic', async (req, res, next) => {
    const [err, traffic] = await system.getTraffic()
    if (err) {
        return res.json({
            code: -1,
            msg: err.message
        })
    }
    res.json({
        code: 0,
        data: {
            traffic
        }
    })
})

router.get('/service/details', async (req, res, next) => {
    res.json({
        code: -1,
        msg: '...'
    })
})

router.get('/service/:unit/enable', async (req, res, next) => { })
router.get('/service/:unit/disable', async (req, res, next) => { })
router.get('/service/:unit/start', async (req, res, next) => { })
router.get('/service/:unit/restart', async (req, res, next) => { })

router.get('/services', async (req, res, next) => {
    const [err1, all] = await system.getSystemAllUnits()
    const [err2, services] = await system.getSystemAllLoadedUnits()
    if (err1 || err2) {
        return res.json({
            code: -1,
            msg: '出错'
        })
    }
    res.json({
        code: 0,
        data: {
            services,
            all
        }
    })
})

export default router
