import { Router } from 'express'
import * as xray from './index.js'

const router = Router()

// 获取节点
router.get('/nodes', (req, res) => {
    let nodes = xray.getNodes().map(v => {
        return {
            proto: v.proto,
            name: v.name,
            from: v.from,
            delay: v.delay,
            speed: v.speed,
            original: v.original,
        }
    })
    res.json({ code: 0, data: nodes })
})

// 删除节点
router.get('/node/:id/del', (req, res) => {
    xray.delNode(Number(req.params.id))
    res.json({ code: 0, msg: '删除成功' })
})

// 节点延迟
router.get('/node/:id/delay', async (req, res) => {
    const [err, delay] = await xray.delayTest(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, delay })
})

// 节点测速
router.get('/node/:id/speed', async (req, res) => {
    const [err, speed] = await xray.speedTest(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, speed })
})

// 测试节点
router.get('/node/:id/test', async (req, res) => {
    const [err, data] = await xray.testNode(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, data })
})

// 获取订阅
router.get('/subscribes', (req, res) => {
    const subscribes = xray.getSubscribes()
    res.json({ code: 0, data: subscribes })
})

// 设置订阅
router.get('/subscribe/:id/set', (req, res) => {
    const { name, url } = req.query
    if (!name || !url) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const { id } = req.params
    xray.setSubscribe(Number(id), {
        name,
        url
    })
    res.json({ code: 0, msg: '添加成功' })
})

// 删除订阅
router.get('/subscribe/:id/del', (req, res) => {
    const { id } = req.params
    xray.delSubscribe(Number(id))
    res.json({ code: 0, msg: '删除成功' })
})

// 更新订阅
router.get('/subscribe/:id/update', async (req, res) => {
    const [err, msg] = await xray.updateSubscribe(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 获取分流
router.get('/routes', async (req, res) => {
    const routes = xray.getRoutes()
    const directList = xray.getDirectList()
    const proxyList = xray.getProxyList()
    const blockList = xray.getBlockList()
    const nodes = xray.getNodes().map(v => {
        return {
            name: v.name,
            from: v.from,
            delay: v.delay,
            speed: v.speed
        }
    })
    res.json({
        code: 0,
        data: {
            routes,
            directList,
            proxyList,
            blockList,
            nodes
        }
    })
})

// 设置分流
router.get('/route/:id/set', async (req, res) => {
    let { outboundTag, desp, rule, value } = req.query
    if (!outboundTag || !desp || !rule || !value) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const { id } = req.params
    if (rule === 'port') {
        value = Number(value)
    } else if (rule !== 'port' && rule !== 'protocol') {
        value = value.split(',')
    }

    const [err, msg] = await xray.setRoute(Number(id), {
        outboundTag,
        desp,
        rule,
        value
    })
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 删除分流
router.get('/route/:id/del', async (req, res) => {
    const { id } = req.params
    const [err, msg] = await xray.delRoute(Number(id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 分流排序
router.get('/routes/sort', async (req, res) => {
    const { from, to } = req.query
    if (!from || !to) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const [err, msg] = await xray.sortRoutes(Number(from), Number(to))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})


// 设置直连列表
router.get('/directlist/set', async (req, res) => {
    const list = (req.query.list || '').split('\n').filter(v => v)
    const [err] = await xray.setDirectList(list)
    if (err) {
        return res.json({ code: 0, msg: '更新成功，但是写入失败' })
    }
    res.json({ code: 0, msg: '更新成功，写入成功' })
})

// 设置代理列表
router.get('/proxylist/set', async (req, res) => {
    const list = (req.query.list || '').split('\n').filter(v => v)
    const [err] = await xray.setProxyList(list)
    if (err) {
        return res.json({ code: 0, msg: '更新成功，但是写入失败' })
    }
    res.json({ code: 0, msg: '更新成功，写入成功' })
})

// 设置拦截列表
router.get('/blocklist/set', async (req, res) => {
    const list = (req.query.list || '').split('\n').filter(v => v)
    const [err] = await xray.setBlockList(list)
    if (err) {
        return res.json({ code: 0, msg: '更新成功，但是写入失败' })
    }
    res.json({ code: 0, msg: '更新成功，写入成功' })
})

// 设置主节点
router.get('/mainnode/set', (req, res) => {
    const { id } = req.query
    if (!id) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    xray.setMainNode(Number(id))
    res.json({ code: 0, msg: '设置成功' })
})

// 保存配置文件
router.get('/config/save', async (req, res) => {
    const [err] = await xray.saveConfig()
    if (err) {
        return res.json({ code: 0, msg: err.message })
    }
    res.json({ code: 0, msg: '保存成功' })
})

// 开启服务
router.get('/service/start', async (req, res) => {
    const [err, msg] = await xray.startXray()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg: '启动成功' })
})

// 停止服务
router.get('/service/stop', async (req, res) => {
    const [err, msg] = await xray.stopXray()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg: '停止成功' })
})

// 重启服务
router.get('/service/restart', async (req, res) => {
    const [err, msg] = await xray.restartXray()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg: '重启成功' })
})

export default router
