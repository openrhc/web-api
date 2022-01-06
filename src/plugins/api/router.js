import os from 'os'
import fs from 'fs'
import { Router } from 'express'

import { exec } from '../../tools.js'

const router = Router()


// 所有服务单元
let allUnit = {}

// 已加载服务列表
let serviceList = []

// 温度列表
const tempList = []

router.get('/status', async (req, res, next) => {
    try {
        const status = getSystemStatus()
        const [result, mem] = await Promise.all([getSystemTraffic(), getSystemMem()])
        res.json({
            code: 0,
            data: {
                status,
                traffic: result,
                mem
            }
        })
    } catch (err) {
        res.json({
            code: -1,
            msg: err.message
        })
    }
})


router.get('/traffic', async (req, res, next) => {
    try {
        const result = await getSystemTraffic()
        res.json({
            code: 0,
            data: {
                traffic: result
            }
        })
    } catch (err) {
        res.json({
            code: -1,
            msg: err.message
        })
    }
})
router.get('/detail/service', async (req, res, next) => {
    try {
        const data = await getPostData(req)
        const result = await detailService(data)
        res.json(result)
    } catch (err) {
        res.json({
            code: -1,
            msg: err.message
        })
    }
})


router.get('/restart/service', async (req, res, next) => {
    try {
        const data = await getPostData(req)
        const result = await restartService(data)
        res.json(result)
    } catch (err) {
        res.json({
            code: -1,
            msg: err.message
        })
    }
})

router.get('/endisabled/service', async (req, res, next) => {
    try {
        const data = await getPostData(req)
        const result = await enDisabled(data)
        res.json(result)
    } catch (err) {
        res.json({
            code: -1,
            msg: err.message
        })
    }
})
router.get('/switch/service', async (req, res, next) => {
    try {
        const data = await getPostData(req)
        const result = await switchService(data)
        res.json(result)
    } catch (err) {
        res.json({
            code: -1,
            msg: err.message
        })
    }
})
router.get('/services', async (req, res, next) => {
    try {
        // 不包含禁止自启和已经关闭的服务
        serviceList = await getLoadedUnits(allUnit)
        // 所以直接将所有单元同时返回给客户端，自行处理
        res.json({
            code: 0,
            data: {
                services: serviceList,
                all: allUnit
            }
        })
    } catch (e) {
        res.json({
            code: -1,
            msg: e
        })
    }
})


// 获取系统信息
const getSystemStatus = () => {
    return {
        arch: os.arch(),
        freemem: os.freemem(),
        totalmem: os.totalmem(),
        release: os.release(),
        uptime: os.uptime(),
        platform: os.platform(),
        cpus: os.cpus(),
        loadavg: os.loadavg(),
        hostname: os.hostname(),
        networkInterfaces: os.networkInterfaces(),
        version: os.version(),
        type: os.type(),
        temp: tempList
    }
}

// 获取系统流量详情
const getSystemTraffic = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('/proc/net/dev', 'utf-8', (err, data) => {
            if (err) return reject(err.message)
            const tmp = []
            data.split('\n').slice(2).filter(v => v.length !== 0).forEach(item => {
                const line = item.replace(/\s+/g, ' ').split(' ').filter(v => v)
                tmp.push({
                    interface: line[0].replace(':', ''),
                    receive: {
                        bytes: Number(line[1]),
                        packets: Number(line[2])
                    },
                    transmit: {
                        bytes: Number(line[9]),
                        packets: Number(line[10])
                    },
                    time: Date.now()
                })
            })
            resolve(tmp)
        })
    })
}

// 获取系统内存详情
const getSystemMem = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('/proc/meminfo', 'utf-8', (err, data) => {
            if (err) return reject(err.message)
            const tmp = {}
            const keys = ['MemTotal', 'Shmem', 'MemFree', 'Buffers', 'Cached', 'SReclaimable']
            data.split('\n').filter(v => v.length !== 0).forEach(item => {
                // ['MemTotal:', '1973776', 'kB']
                const line = item.replace(/\s+/g, ' ').split(' ')
                const key = line[0].replace(':', '')
                if (keys.includes(key)) tmp[key] = Number(line[1])
            })
            resolve(tmp)
        })
    })
}

// 获取系统温度
const getSystemTemp = () => {
    try {
        const temp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf-8')
        tempList.push(Number(temp) / 1000)
    } catch (e) {
        tempList.push(0)
    }
    // 只保留14条数据
    if (tempList.length > 14) tempList.splice(0, 1)
}

// 开启或关闭一个系统服务
const switchService = (obj) => {
    return new Promise((resolve, reject) => {
        const { unit, flag } = obj
        const res = spawn('systemctl', [flag ? 'start' : 'stop', unit])
        let data = ''
        let err = ''
        res.stdout.on('data', chunk => data += chunk)
        res.stderr.on('data', data => err += data)
        res.on('close', (code) => {
            if (code !== 0) return reject(err)
            resolve({
                code: 0,
                msg: '操作成功'
            })
        })
    })
}

// 允许或禁止自启一个系统服务
const enDisabled = (obj) => {
    return new Promise((resolve, reject) => {
        const { unit, state } = obj
        const res = spawn('systemctl', [state === 'disabled' ? 'enable' : 'disable', unit])
        let data = ''
        let err = ''
        res.stdout.on('data', chunk => data += chunk)
        res.stderr.on('data', data => err += data)
        res.on('close', (code) => {
            if (code !== 0) return reject(err)
            allUnit[unit] = (state === 'disabled' ? 'enabled' : 'disabled')
            resolve({
                code: 0,
                msg: '操作成功'
            })
        })
    })
}

// 重启一个系统服务
const restartService = (obj) => {
    return new Promise((resolve, reject) => {
        const { unit } = obj
        const res = spawn('systemctl', ['restart', unit])
        let data = ''
        let err = ''
        res.stdout.on('data', chunk => data += chunk)
        res.stderr.on('data', data => err += data)
        res.on('close', (code) => {
            if (code !== 0) return reject(err)
            resolve({
                code: 0,
                msg: '操作成功'
            })
        })
    })
}

// 获取所有单元文件
const getAllUnit = () => {
    return new Promise((resolve, reject) => {
        const res = spawn('systemctl', ['list-unit-files', '--all', '--type', 'service'])
        let data = ''
        let err = ''
        res.stdout.on('data', chunk => data += chunk)
        res.stderr.on('data', data => err += data)
        res.on('close', (code) => {
            if (code !== 0) return reject(err)
            const arr2 = data.split('\n').filter(item => item.indexOf('.service') !== -1)
            const tmp = {}
            arr2.forEach(item => {
                let line = item.replace(/\s+/g, ' ')
                line = line.split(' ').filter(v => v)
                tmp[line[0]] = line[1]
            })
            resolve(tmp)
        })
    })
}

// 获取已加载的单元
const getLoadedUnits = (units) => {
    return new Promise((resolve, reject) => {
        const res = spawn('systemctl', ['list-units', '--all', '--type', 'service'])
        let data = ''
        let err = ''
        res.stdout.on('data', chunk => data += chunk)
        res.stderr.on('data', data => err += data)
        res.on('close', (code) => {
            if (code !== 0) return reject(err)
            const arr = data.split('\n').filter(item => item.indexOf('.service') !== -1 && item.indexOf('not-found') === -1)
            const tmp = []
            arr.forEach(item => {
                let line = item.replace(/\s+/g, ' ')
                line = line.split(' ').filter(v => v)
                const service = {
                    unit: line[0] === '●' ? line[1] : line[0],
                    active: line[0] === '●' ? line[3] : line[2],
                    description: line.slice(line[0] === '●' ? 5 : 4).join(' '),
                    state: units[line[0] === '●' ? line[1] : line[0]] || 'unknow'
                }
                tmp.push(service)
            })
            resolve(tmp)
        })
    })
}

// 查看一个系统服务的详情
const detailService = (obj) => {
    return new Promise((resolve, reject) => {
        const { unit } = obj
        const res = spawn('systemctl')
    })

}

// 获取POST数据
const getPostData = (req) => {
    return new Promise((resolve, reject) => {
        let data = ''
        req.on('data', chunk => data += chunk)
        req.on('end', () => {
            data = decodeURI(data)
            try {
                resolve(JSON.parse(data))
            } catch (err) {
                reject(err)
            }
        })
    })
}

// 初始化
async function init() {

    // 启动时获取一次温度
    getSystemTemp()

    // 定时任务：每1分钟获取一次温度
    setInterval(getSystemTemp, 1000 * 60)

    // 获取系统所有单元
    console.log('加载系统服务单元')
    try {
        allUnit = await getAllUnit()
        // console.log(allUnit)
    } catch (e) {
        console.log(e)
        process.exit(-1)
    }
}

export default router
