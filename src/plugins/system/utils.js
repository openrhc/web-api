import os from 'os'
import * as tools from '../../tools.js'

/**
 * 获取系统基本信息
 * @returns 
 */
export function getStatus() {
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
        type: os.type()
    }
}

/**
 * 获取系统流量详情
 * @returns 
 */
export function getTraffic() {
    return new Promise(async resolve => {
        const [err, data] = await tools.readFile('/proc/net/dev')
        if (err) {
            console.log(err)
            return resolve([err, null])
        }
        const traffic = data.split('\n').slice(2).filter(v => v.length !== 0).map(v => {
            const line = v.replace(/\s+/g, ' ').split(' ').filter(v => v)
            return {
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
            }
        })
        resolve([null, traffic])
    })
}

/**
 * 获取系统内存详情
 * @returns 
 */
export function getSystemMem() {
    return new Promise(async resolve => {
        const [err, data] = await tools.readFile('/proc/meminfo')
        if (err) {
            console.log(err)
            return resolve([err, null])
        }
        const mem = {}
        const keys = ['MemTotal', 'Shmem', 'MemFree', 'Buffers', 'Cached', 'SReclaimable']
        data.split('\n').filter(v => v.length !== 0).forEach(item => {
            // ['MemTotal:', '1973776', 'kB']
            const line = item.replace(/\s+/g, ' ').split(' ')
            const key = line[0].replace(':', '')
            if (keys.includes(key)) {
                mem[key] = Number(line[1])
            }
        })
        resolve([null, mem])
    })
}

/**
 * 获取系统温度
 */
export function getSystemTemp() {
    return new Promise(async resolve => {
        const [err, data] = await tools.readFile('/sys/class/thermal/thermal_zone0/temp')
        if (err) {
            console.log(err)
            return resolve([err, null])
        }
        const temp = Number(data) / 1000
        resolve([null, temp])
    })

}

/**
 * 操作系统服务
 * @param {string} action 操作：start stop restart disable enable
 * @param {string} unit 服务名 
 * @returns 
 */
function doService(action, unit) {
    return new Promise(async resolve => {
        const [err, res] = await tools.exec('systemctl', [action, unit])
        if (err) {
            return resolve([err, null])
        }
        resolve([null, '操作成功'])
    })
}

/**
 * 启动系统服务
 * @param {string} unit 服务名
 */
export function startService(unit) {
    return doService('start', unit)
}

/**
 * 停止系统服务
 * @param {string} unit 服务名
 */
export function stopService(unit) {
    return doService('stop', unit)
}

/**
 * 重启系统服务
 * @param {string} unit 服务名
 */
export function restartService(unit) {
    return doService('restart', unit)
}

/**
 * 允许系统服务自启
 * @param {string} unit 服务名
 */
export function enableService(unit) {
    return doService('enable', unit)
}

/**
 * 关闭系统服务自启
 * @param {string} unit 服务名
 */
export function disableService(unit) {
    return doService('disable', unit)
}

/**
 * 获取所有单元文件
 * @returns 
 */
export function getSystemAllUnits() {
    return new Promise(async resolve => {
        const [err, res] = tools.exec('systemctl', ['list-unit-files', '--all', '--type', 'service'])
        if (err) {
            return resolve([err, null])
        }
        const arr = res.split('\n').filter(item => item.indexOf('.service') !== -1)
        const units = {}
        arr.forEach(item => {
            let line = item.replace(/\s+/g, ' ')
            line = line.split(' ').filter(v => v)
            units[line[0]] = line[1]
        })
        resolve([null, units])
    })
}

/**
 * 获取已加载的单元
 * @param {*} units 
 * @returns 
 */
export function getSystemAllLoadedUnits() {
    return new Promise((resolve, reject) => {
        const [err, res] = tools.exec('systemctl', ['list-units', '--all', '--type', 'service'])
        if (err) {
            return resolve([err, null])
        }
        const arr = res.split('\n').filter(item => item.indexOf('.service') !== -1 && item.indexOf('not-found') === -1)
        const units = []
        arr.forEach(item => {
            let line = item.replace(/\s+/g, ' ')
            line = line.split(' ').filter(v => v)
            const service = {
                unit: line[0] === '●' ? line[1] : line[0],
                active: line[0] === '●' ? line[3] : line[2],
                description: line.slice(line[0] === '●' ? 5 : 4).join(' '),
                state: units[line[0] === '●' ? line[1] : line[0]] || 'unknow'
            }
            units.push(service)
        })
        resolve([null, units])
    })
}
