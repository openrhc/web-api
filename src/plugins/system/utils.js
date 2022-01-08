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