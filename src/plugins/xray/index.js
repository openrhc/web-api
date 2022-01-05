import { exec, readFile, writeFile, axiosGet } from '../../tools.js'

import { SERVICE_NAME, TEMPLATE_FILE, XRAY_CONFIG_PATH, SPEEDTEST_FILE, SPEEDTEST_FILE_SIZE } from './config.js'

import { parseNodes, getDelay, getSpeed, addOutbound, delOutbound } from './utils.js'

// 订阅列表
let subscribes = [
    {
        name: '本地订阅',
        url: 'file:///root/web-api/jc.json'
    }
]

// 节点列表
let nodes = []

// 分流列表
let routes = []

// 直连列表
let directList = []

// 模板文件对象
let config = {}

// 代理列表
let proxyList = []

// 主节点
let mainNode = {};

// 读取模板文件: 解析分流规则、读取直连/代理列表
; (async function () {
    // 解析分流规则
    const [err, data] = await readFile(TEMPLATE_FILE)
    if (err) {
        console.log(err)
        return
    }
    const str = data.split('\n').filter(item => !item.trim().startsWith('//')).join('\n')
    config = JSON.parse(str)
    const type = ["domain", "ip", "protocol", "network", "port", "inboundTag"];
    config.routing.rules.forEach(rule => {
        let obj = {
            outboundTag: rule.outboundTag,
            desp: rule.desp,
        }
        for (let i = 0; i < type.length; i++) {
            const t = type[i]
            if (rule[t]) {
                obj.rule = t
                obj.value = rule[t]
                break
            }
        }
        routes.push(obj)
    })
    // 读取直连/代理列表
    const [err1, data1] = await readFile('./src/plugins/xray/direct.list')
    if (err1) {
        console.log(err1)
        return
    }
    directList = data1.split('\n')
    const [err2, data2] = await readFile('./src/plugins/xray/proxy.list')
    if (err2) {
        console.log(err2)
        return
    }
    proxyList = data2.split('\n')
})()

/**
 * 开启xray服务
 */
export function startXray() {
    return exec('systemctl', ['start', SERVICE_NAME])
}

/*
 * 停止xray服务
 */
export function stopXray() {
    return exec('systemctl', ['stop', SERVICE_NAME])
}

/*
 * 重启xray服务
 */
export function restartXray() {
    return exec('systemctl', ['restart', SERVICE_NAME])
}

/**
 * 更新订阅
 * @param {*} i 索引
 * @returns 
 */
export function updateSubscribe(i) {
    return new Promise(async (resolve) => {
        if (i < 0 || i >= subscribes.length) {
            return resolve([new Error('超出范围'), null])
        }
        const subscribe = subscribes[i]
        // 1. 移除旧的节点
        nodes = nodes.filter(v => v.from !== subscribe.name)
        if (subscribe.url.startsWith('file://')) {
            // 2. 添加新的节点
            const [err, data] = await readFile(subscribe.url.substring(7))
            if (err) {
                console.log(err)
                return resolve([err, null])
            }
            nodes.push(...parseNodes(data.toString(), subscribe.name))
        } else if (subscribe.url.match(/^https?:\/\//g)) {
            const [err, data] = await axiosGet(subscribe.url)
            if (err) {
                console.log(err)
                return resolve([err, null])
            }
            nodes.push(...parseNodes(data), subscribe.name)
        } else {
            return resolve([new Error('不支持的协议', null)])
        }
        resolve([null, '更新成功'])
    })
}

/*
 * 延迟检测
 */
export function delayTest(index) {
    console.log('触发函数：delayTest')
    // 流量由xray-in:10810入口进入，由xray-out出口出去
    return new Promise(async (resolve, reject) => {
        if (index < 0 || index >= nodes.length) {
            return resolve([new Error('超出范围'), null])
        }
        // 删除一个outbound
        const [err1, res1] = await delOutbound(nodes[index].outbound)
        if (err1) {
            console.log(err1)
            return resolve([err1, null])
        }
        // 新增一个outbound
        const [err2, res2] = await addOutbound(nodes[index].outbound)
        if (err2) {
            console.log(err2)
            return resolve([err2, null])
        }
        // 调用axios发起一个请求测延迟
        const [err3, res3] = await getDelay('http://www.gstatic.com/generate_204', 10000)
        if (err3) {
            return resolve([err3, null])
        }
        nodes[index].delay = res3
        resolve([null, res3])
    })
}

/*
 * 节点测速
 */
export function speedTest(index) {
    console.log('触发函数：speedTest')
    // 流量由xray-in:10810入口进入，由xray-out出口出去
    return new Promise(async (resolve, reject) => {
        if (index < 0 || index >= nodes.length) {
            return resolve([new Error('超出范围'), null])
        }
        // 删除一个outbound
        const [err1, res1] = await delOutbound(nodes[index].outbound)
        if (err1) {
            return resolve([err1, null])
        }
        // 新增一个outbound
        const [err2, res2] = await addOutbound(nodes[index].outbound)
        if (err2) {
            return resolve([err2, null])
        }
        // 调用axios测试速度
        const [err3, res3] = await getSpeed(SPEEDTEST_FILE, SPEEDTEST_FILE_SIZE, 20000)
        if (err3) {
            return resolve([err3, null])
        }
        nodes[index].speed = res3
        resolve([null, res3])
    })
}

/**
 * 测试节点延迟、网速
 * @param {number} index 索引
 * @returns 
 */
export function testNode(index) {
    console.log('触发函数：testNode')
    return new Promise(async (resolve) => {
        if (index < 0 || index >= nodes.length) {
            return resolve([new Error('超出范围'), null])
        }
        // 删除一个outbound
        const [err1, res1] = await delOutbound(nodes[index].outbound)
        if (err1) {
            console.log(err1)
            return resolve([err1, null])
        }
        // 新增一个outbound
        const [err2, res2] = await addOutbound(nodes[index].outbound)
        if (err2) {
            console.log(err2)
            return resolve([err2, null])
        }
        // 调用axios测延迟
        const [err3, res3] = await getDelay('http://www.gstatic.com/generate_204', 10000)
        if (err3) {
            return resolve([err3, null])
        }
        // 调用axios测速度
        const [err4, res4] = await getSpeed(SPEEDTEST_FILE, SPEEDTEST_FILE_SIZE, 20000)
        if (err4) {
            return resolve([err4, null])
        }
        nodes[index].delay = res3
        nodes[index].speed = res4
        resolve([null, { delay: res3, speed: res4 }])
    })
}

/*
 * 保存配置到config.json文件
 */
export function saveConfig() {
    return new Promise(async resolve => {
        const rules = []
        const outbounds = []

        // 关于基于geosite和geoip的自定义直连、代理列表，需要进行再一次细分，以免直连中的geosite/geoip影响到代理中的域名，反之代理中的geosite/geoip也会影响到直连中的域名，关键在于顺序。
        // TODO：


        // 解析内置规则
        routes.forEach(v => {
            // 生成客户端可用的rule配置项
            const rule = {
                type: 'field',
                outboundTag: v.outboundTag,
                [v.rule]: v.value
            }
            // 查找当前rule配置项所用的节点
            const node = nodes.find(n => n.name === v.outboundTag)
            // 找到说明使用了代理中的某个节点（将它添加到outbounds中）
            // 并且判断outbounds中是否已经添加了
            // 否则是使用了模板中自定义的出口或已经添加过，不需要处理
            if (node && !outbounds.find(o => o.tag === node.name)) {
                // 将rule使用的节点添加到outbounds列表
                outbounds.push({
                    ...node.outbound,
                    tag: node.name
                })
            }
            rules.push(rule)
        })

        // 解析直连规则
        const direct_domain = []
        const direct_ip = []
        const direct_protocol = []
        const direct_port = []
        for (let i = 0; i < directList.length; i++) {
            let [proto, ...v] = directList[i].split(':')
            if (!proto || !v) {
                continue
            }
            v = v.join(':')
            if (proto === 'domain') {
                direct_domain.push(v)
            } else if (proto === 'ip') {
                direct_ip.push(v)
            } else if (proto === 'protocol') {
                direct_protocol.push(v)
            } else if (proto === 'port') {
                direct_port.push(Number(v))
            }
        }
        if (direct_domain.length) {
            rules.push({
                type: 'field',
                outboundTag: 'direct',
                domain: direct_domain
            })
        }
        if (direct_ip.length) {
            rules.push({
                type: 'field',
                outboundTag: 'direct',
                ip: direct_ip
            })
        }
        direct_protocol.forEach(v => {
            rules.push({
                type: 'field',
                outboundTag: 'direct',
                protocol: v
            })
        })
        direct_port.forEach(v => {
            rules.push({
                type: 'field',
                outboundTag: 'direct',
                port: v
            })
        })
        // 解析代理规则
        const proxy_domain = []
        const proxy_ip = []
        const proxy_protocol = []
        const proxy_port = []
        for (let i = 0; i < proxyList.length; i++) {
            let [proto, ...v] = proxyList[i].split(':')
            if (!proto || !v) {
                continue
            }
            v = v.join(':')
            if (proto === 'domain') {
                proxy_domain.push(v)
            } else if (proto === 'ip') {
                proxy_ip.push(v)
            } else if (proto === 'protocol') {
                proxy_protocol.push(v)
            } else if (proto === 'port') {
                proxy_port.push(Number(v))
            }
        }
        if (proxy_domain.length) {
            rules.push({
                type: 'field',
                outboundTag: 'proxy',
                domain: proxy_domain
            })
        }
        if (proxy_ip.length) {
            rules.push({
                type: 'field',
                outboundTag: 'proxy',
                ip: proxy_ip
            })
        }
        proxy_protocol.forEach(v => {
            rules.push({
                type: 'field',
                outboundTag: 'proxy',
                protocol: v
            })
        })
        proxy_port.forEach(v => {
            rules.push({
                type: 'field',
                outboundTag: 'proxy',
                port: v
            })
        })

        // 复制一份config对象
        const config_copy = JSON.parse(JSON.stringify(config))

        config_copy.routing.rules = rules
        config_copy.outbounds.push(...outbounds)

        // 设置主节点
        const idx = config_copy.outbounds.findIndex(v => v.tag === 'proxy')
        if (idx !== -1) {
            config_copy.outbounds[idx] = mainNode.outbound
        } else {
            config_copy.outbounds.unshift(mainNode.outbound)
        }

        const [err, res] = await writeFile(XRAY_CONFIG_PATH, config_copy)
        if (err) {
            return resolve([err, null])
        }
        resolve([null, '保存成功'])
    })
}

/**
 * 获取分流列表
 * @returns 
 */
export function getRoutes() {
    return routes
}

/**
 * 设置分流规则
 * @param {number} i 索引
 * @param {object}} newRoute 新的分流规则
 */
export function setRoute(i, newRoute) {
    routes[i] = newRoute
}

/**
 * 删除分流规则
 * @param {number} i 索引
 */
export function delRoute(i) {
    if (i >= 0 && i < routes.length) {
        routes.splice(i, 1)
    }
}

/**
 * 获取节点列表
 * @returns 
 */
export function getNodes() {
    return nodes
}

/**
 * 设置节点
 * @param {number} i 索引
 * @param {object} newNode 新的节点
 */
export function setNode(i, newNode) {
    nodes[i] = newNode
}

/**
 * 删除节点
 * @param {number} i 索引
 */
export function delNode(i) {
    if (i >= 0 && i < nodes.length) {
        nodes.splice(i, 1)
    }
}

/**
 * 获取订阅列表
 * @returns 
 */
export function getSubscribes() {
    return subscribes
}

/**
 * 设置订阅
 * @param {number} id 索引
 * @param {object} newSubscribe 新的订阅
 * @returns 
 */
export function setSubscribe(id, newSubscribe) {
    if (id < 0 || id > subscribes.length) {
        return
    }
    // 添加
    if (id === subscribes.length) {
        subscribes[id] = newSubscribe
        return
    }
    // 更新节点中的from
    const oldname = subscribes[id].name
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].from === oldname) {
            nodes[i].from = newSubscribe.name
        }
    }
    // 更新订阅中的name
    subscribes[id] = newSubscribe
}

/**
 * 删除订阅
 * @param {number} i 索引
 */
export function delSubscribe(i) {
    if (i >= 0 && i < subscribes.length) {
        subscribes.splice(i, 1)
    }
}

/**
 * 获取直连列表
 * @returns 
 */
export function getDirectList() {
    return directList
}

/**
 * 设置直连列表
 * @param {array} newDirectList 新的直连列表
 */
export function setDirectList(newDirectList) {
    return new Promise(async resolve => {
        directList = newDirectList
        const [err, res] = await writeFile('./src/plugins/xray/direct.list', directList.join('\n'))
        if (err) {
            return resolve([err, null])
        }
        resolve([null, 'OK'])
    })
}

/**
 * 获取代理列表
 * @returns 
 */
export function getProxyList() {
    return proxyList
}

/**
 * 设置代理列表
 * @param {array} newProxyList 新的代理列表
 */
export function setProxyList(newProxyList) {
    return new Promise(async resolve => {
        proxyList = newProxyList
        const [err, res] = await writeFile('./src/plugins/xray/proxy.list', proxyList.join('\n'))
        if (err) {
            return resolve([err, null])
        }
        resolve([null, 'OK'])
    })
}

/**
 * 获取主节点
 * @returns 
 */
export function getMainNode() {
    return mainNode
}

/**
 * 设置主节点
 * @param {*} i 索引
 */
export function setMainNode(i) {
    if (i >= 0 && i < nodes.length) {
        mainNode = nodes[i]
    }
}
