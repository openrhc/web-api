import { Router } from 'express'
import * as proxy from './index.js'

const router = Router()

// 获取节点
router.get('/nodes', (req, res) => {
    let nodes = proxy.getNodes()
    nodes = nodes.map(v => {
        return {
            proto: v.proto,
            name: v.name,
            from: v.from,
            delay: v.delay,
            speed: v.speed,
            tips: v.tips,
            active: v.active === true,
            // original: v.original,
        }
    })
    res.json({ code: 0, data: nodes })
})

// 删除节点
router.get('/node/:id/del', (req, res) => {
    const [err, msg] = proxy.delNode(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err })
    }
    res.json({ code: 0, msg })
})

// 添加节点
router.post('/nodes/add', (req, res) => {
    const { sharelink } = req.body
    if (!sharelink) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const [err, data] = proxy.addNode(sharelink)
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, data })
})

// 节点排序
router.get('/nodes/sort', (req, res) => {
    const { from, to } = req.query
    if (!from || !to) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const [err, msg] = proxy.sortNodes(Number(from), Number(to))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 测试节点
router.get('/node/:id/test', async (req, res) => {
    const [err, data] = await proxy.testNode(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, data })
})

// 获取订阅
router.get('/subscribes', (req, res) => {
    const subscribes = proxy.getSubscribes()
    res.json({ code: 0, data: subscribes })
})

// 设置订阅
router.get('/subscribe/:id/set', (req, res) => {
    const { name, url } = req.query
    if (!name || !url) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const { id } = req.params
    const [err, msg] = proxy.setSubscribe(Number(id), { name, url })
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 删除订阅
router.get('/subscribe/:id/del', (req, res) => {
    const { id } = req.params
    const [err, msg] = proxy.delSubscribe(Number(id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 更新订阅
router.get('/subscribe/:id/update', async (req, res) => {
    const [err, msg] = await proxy.updateSubscribe(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 清空订阅
router.get('/subscribe/:id/empty', (req, res) => {
    const [err, msg] = proxy.emptySubscribe(Number(req.params.id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 获取分流
router.get('/routes', async (req, res) => {
    const routes = proxy.getRoutes()
    const directList = proxy.getDirectList()
    const proxyList = proxy.getProxyList()
    const blockList = proxy.getBlockList()
    const nodes = proxy.getNodes().map(v => {
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
router.get('/route/:id/set', (req, res) => {
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
    const [err, msg] = proxy.setRoute(Number(id), {
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
router.get('/route/:id/del', (req, res) => {
    const { id } = req.params
    const [err, msg] = proxy.delRoute(Number(id))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 分流排序
router.get('/routes/sort', (req, res) => {
    const { from, to } = req.query
    if (!from || !to) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const [err, msg] = proxy.sortRoutes(Number(from), Number(to))
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 设置直连列表
router.get('/directlist/set', (req, res) => {
    const list = (req.query.list || '').split('\n').filter(v => v)
    proxy.setDirectList(list)
    res.json({ code: 0, msg: '更新成功' })
})

// 设置代理列表
router.get('/proxylist/set', (req, res) => {
    const list = (req.query.list || '').split('\n').filter(v => v)
    proxy.setProxyList(list)
    res.json({ code: 0, msg: '更新成功' })
})

// 设置拦截列表
router.get('/blocklist/set', (req, res) => {
    const list = (req.query.list || '').split('\n').filter(v => v)
    proxy.setBlockList(list)
    res.json({ code: 0, msg: '更新成功' })
})

// 设置主节点
router.get('/mainnode/set', async (req, res) => {
    const { id } = req.query
    if (!id) {
        return res.json({ code: -1, msg: '缺少参数' })
    }
    const [err, msg] = await proxy.setMainNode(Number(id))
    if (err) {
        return res.json({ code: 0, msg: err.message })
    }
    res.json({ code: 0, msg })
})

// 开启服务
router.get('/service/start', async (req, res) => {
    const [err, msg] = await proxy.startProxy()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg: '启动成功' })
})

// 停止服务
router.get('/service/stop', async (req, res) => {
    const [err, msg] = await proxy.stopProxy()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg: '停止成功' })
})

// 重启服务
router.get('/service/restart', async (req, res) => {
    const [err, msg] = await proxy.restartProxy()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, msg: '重启成功' })
})

// 服务状态
router.get('/service/status', async (req, res) => {
    const [err, status] = await proxy.statusProxy()
    if (err) {
        return res.json({ code: -1, msg: err.message })
    }
    res.json({ code: 0, data: status })
})

export default router
