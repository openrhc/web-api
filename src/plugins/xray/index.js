import * as tools from '../../tools.js'
import * as config from './config.js'
import * as utils from './utils.js'

// 订阅列表
let subscribes = [
    {
        name: '本地订阅',
        url: 'file:///root/jc.json'
    }
]

// 模板文件对象
let tpl = {}

// 节点列表
let nodes = []

// 分流列表
let routes = []

// 存放直连/代理/拦截列表
const customList = [
    [], // directList
    [], // proxyList
    [], // blockList
]

// 主节点
let mainNode = {};

// 读取模板文件: 解析分流规则、读取直连/代理列表
; (async function () {
    // 读取模板文件
    const [err, data] = await tools.readFile(config.TEMPLATE_FILE)
    if (err) {
        throw err
    }
    const str = data.split('\n')
        .filter(v => !v.trim().startsWith('//'))
        .join('\n')
    tpl = JSON.parse(str)
    // 读取自定义分流规则
    const [err1, data2] = await tools.readFile(config.ROUTES_FILE)
    if (err1) {
        console.log(err1)
    } else {
        try {
            routes.push(...JSON.parse(data2))
        } catch (e) {
            console.log(e)
        }
    }
    // 读取直连/代理/拦截列表
    const list = ['direct.list', 'proxy.list', 'block.list']
    for (let i = 0; i < list.length; i++) {
        const [err, data] = await tools.readFile('./src/plugins/xray/data/' + list[i])
        if (err) {
            console.log(err)
            continue
        }
        customList[i] = data.split('\n')
    }

})()

/**
 * 开启xray服务
 */
export function startXray() {
    return tools.exec('systemctl', ['start', config.SERVICE_NAME])
}

/*
 * 停止xray服务
 */
export function stopXray() {
    return tools.exec('systemctl', ['stop', config.SERVICE_NAME])
}

/*
 * 重启xray服务
 */
export function restartXray() {
    return tools.exec('systemctl', ['restart', config.SERVICE_NAME])
}

/**
 * 获取服务状态
 */
export function statusXray() {
    return new Promise(async resolve => {
        // 是否在运行
        const [err, isActive] = await tools.exec('systemctl', ['is-active', config.SERVICE_NAME])
        if (err) {
            return resolve([err, null])
        }
        // 是否自启动
        const [err1, isEnabled] = await tools.exec('systemctl', ['is-enabled', config.SERVICE_NAME])
        if (err1) {
            return resolve([err1, null])
        }
        const status = {
            active: isActive.trim() === 'active',
            enabled: isEnabled.trim() === 'enabled'
        }
        resolve([null, status])
    })
}

/**
 * 更新订阅
 * @param {*} i 索引
 * @returns 
 */
export function updateSubscribe(i) {
    console.log('触发函数: updateSubscribe')
    return new Promise(async (resolve) => {
        if (i < 0 || i >= subscribes.length) {
            return resolve([new Error('超出范围'), null])
        }
        const subscribe = subscribes[i]
        // 1. 移除旧的节点
        nodes = nodes.filter(v => v.from !== subscribe.name)
        // 2. 判断协议
        if (subscribe.url.startsWith('file://')) {
            const [err, data] = await tools.readFile(subscribe.url.substring(7))
            if (err) {
                console.log(err)
                return resolve([err, null])
            }
            nodes.push(...utils.parseNodes(data.toString(), subscribe.name))
        } else if (subscribe.url.match(/^https?:\/\//g)) {
            const [err, data] = await tools.axiosGet(subscribe.url)
            if (err) {
                console.log(err)
                return resolve([err, null])
            }
            nodes.push(...utils.parseNodes(data), subscribe.name)
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
    console.log('触发函数: delayTest')
    // 流量由xray-in:10810入口进入，由xray-out出口出去
    return new Promise(async (resolve, reject) => {
        if (index < 0 || index >= nodes.length) {
            return resolve([new Error('超出范围'), null])
        }
        // 删除一个outbound
        const [err1, res1] = await utils.delOutbound(nodes[index].outbound, 'xray-out')
        if (err1) {
            console.log(err1)
            return resolve([err1, null])
        }
        // 新增一个outbound
        const [err2, res2] = await utils.addOutbound(nodes[index].outbound, 'xray-out')
        if (err2) {
            console.log(err2)
            return resolve([err2, null])
        }
        // 调用axios发起一个请求测延迟
        const [err3, res3] = await utils.getDelay(config.DELAYTEST_URL, 10000)
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
        const [err1, res1] = await utils.delOutbound(nodes[index].outbound, 'xray-out')
        if (err1) {
            return resolve([err1, null])
        }
        // 新增一个outbound
        const [err2, res2] = await utils.addOutbound(nodes[index].outbound, 'xray-out')
        if (err2) {
            return resolve([err2, null])
        }
        // 调用axios测试速度
        const [err3, res3] = await utils.getSpeed(config.SPEEDTEST_URL, config.SPEEDTEST_URL_SIZE, 20000)
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
        const [err1, res1] = await utils.delOutbound(nodes[index].outbound, 'xray-out')
        if (err1) {
            console.log(err1)
            return resolve([err1, null])
        }
        // 新增一个outbound
        const [err2, res2] = await utils.addOutbound(nodes[index].outbound, 'xray-out')
        if (err2) {
            console.log(err2)
            return resolve([err2, null])
        }
        nodes[index].tips = 'Loading'
        // 调用axios测延迟
        const [err3, res3] = await utils.getDelay(config.DELAYTEST_URL, 10000)
        if (err3) {
            console.log(err3)
            nodes[index].tips = err3.message
            return resolve([err3, null])
        }
        // 调用axios测速度
        const [err4, res4] = await utils.getSpeed(config.SPEEDTEST_URL, config.SPEEDTEST_URL_SIZE, 20000)
        if (err4) {
            console.log(err4)
            nodes[index].tips = err4.message
            return resolve([err4, null])
        }
        nodes[index].delay = res3
        nodes[index].speed = res4
        nodes[index].tips = ''
        resolve([null, { delay: res3, speed: res4 }])
    })
}

/*
 * 保存配置到config.json文件
 */
export function saveConfig() {
    console.log('触发函数：saveConfig')
    return new Promise(async resolve => {
        const rules = []
        const outbounds = []
        // 关于基于geosite和geoip的自定义直连、代理列表，需要进行再一次细分，以免直连中的geosite/geoip影响到代理中的域名，反之代理中的geosite/geoip也会影响到直连中的域名，关键在于顺序。
        // TODO：

        // 解析routes中的规则
        routes.forEach(v => {
            // 将routes规则转为客户端可用规则
            const rule = {
                type: 'field',
                outboundTag: v.outboundTag,
                [v.rule]: v.value
            }
            rules.push(rule)
            // 查找当前规则所用的节点，添加到outbounds中
            const node = nodes.find(n => n.name === v.outboundTag)
            if (node && !outbounds.find(o => o.tag === node.name)) {
                outbounds.push({
                    ...node.outbound,
                    tag: node.name
                })
            }
        })

        // 解析直连、代理、拦截列表中的规则
        const customs = []
        const outboundTags = ['direct', 'proxy', 'block']
        for (let i = 0; i < customList.length; i++) {
            const DPBList = [
                [], // 基于domain的规则
                [], // 基于ip的规则
                [], // 基于protocol的规则
                [], // 基于port的规则
            ]
            for (let j = 0; j < customList[i].length; j++) {
                let [proto, ...v] = customList[i][j].split(':')
                if (!proto || !v) {
                    continue
                }
                v = v.join(':')
                if (proto === 'domain') {
                    DPBList[0].push(v)
                } else if (proto === 'ip') {
                    DPBList[1].push(v)
                } else if (proto === 'protocol') {
                    DPBList[2].push(v)
                } else if (proto === 'port') {
                    DPBList[3].push(Number(v))
                }
            }
            if (DPBList[0].length) {
                customs.push({
                    type: 'field',
                    outboundTag: outboundTags[i],
                    domain: DPBList[0]
                })
            }
            if (DPBList[1].length) {
                customs.push({
                    type: 'field',
                    outboundTag: outboundTags[i],
                    ip: DPBList[1]
                })
            }
            DPBList[2].forEach(v => {
                customs.push({
                    type: 'field',
                    outboundTag: outboundTags[i],
                    protocol: v
                })
            })
            DPBList[3].forEach(v => {
                customs.push({
                    type: 'field',
                    outboundTag: outboundTags[i],
                    port: v
                })
            })
        }

        // 将customs插到锚点上
        const customIdx = rules.findIndex(v => v.custom)
        rules.splice(customIdx, 1, ...customs)

        // 复制一份tpl对象
        const tpl_copy = JSON.parse(JSON.stringify(tpl))

        tpl_copy.routing.rules = rules
        tpl_copy.outbounds.push(...outbounds)

        // 如果没有设置主节点，则使用第一个节点作为主节点
        if (!mainNode.name && nodes[0]) {
            mainNode = nodes[0]
        }
        const proxyIdx = tpl_copy.outbounds.findIndex(v => v.tag === 'proxy')
        tpl_copy.outbounds[proxyIdx] = mainNode.outbound
        // console.log(JSON.stringify(tpl_copy, null, 2))
        const [err, res] = await tools.writeFile(config.XRAY_CONFIG_FILE, tpl_copy)
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
    return new Promise(async resolve => {
        routes[i] = newRoute
        const [err, res] = await tools.writeFile(config.ROUTES_FILE, routes)
        if (err) {
            return resolve([err, '添加成功，写入失败'])
        }
        resolve([null, '添加成功，写入成功'])
    })
}

/**
 * 删除分流规则
 * @param {number} i 索引
 */
export function delRoute(i) {
    return new Promise(async resolve => {
        if (i < 0 || i >= routes.length) {
            return resolve([new Error('超出范围'), null])
        }
        routes.splice(i, 1)
        const [err, res] = await tools.writeFile(config.ROUTES_FILE, routes)
        if (err) {
            return resolve([err, '删除成功，写入失败'])
        }
        resolve([null, '删除成功，写入成功'])
    })
}

/**
 * 分流规则排序
 * @param {number} from 源索引
 * @param {number} to 目标索引
 * @returns 
 */
export function sortRoutes(from, to) {
    return new Promise(async resolve => {
        if (from < 0 || from >= routes.length || to < 0 || to >= routes.length) {
            return resolve([new Error('超出范围'), null])
        }
        const tmp = routes.splice(from, 1);
        routes.splice(to, 0, ...tmp);
        const [err, res] = await tools.writeFile(config.ROUTES_FILE, routes)
        if (err) {
            return resolve([err, '排序成功，写入失败'])
        }
        resolve([null, '排序成功，写入成功'])
    })
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
    return customList[0]
}

/**
 * 设置直连列表
 * @param {array} newDirectList 新的直连列表
 */
export function setDirectList(newDirectList) {
    return new Promise(async resolve => {
        customList[0] = newDirectList
        const [err, res] = await tools.writeFile(config.DIRECT_FILE, customList[0].join('\n'))
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
    return customList[1]
}

/**
 * 设置代理列表
 * @param {array} newProxyList 新的代理列表
 */
export function setProxyList(newProxyList) {
    return new Promise(async resolve => {
        customList[1] = newProxyList
        const [err, res] = await tools.writeFile(config.PROXY_FILE, customList[1].join('\n'))
        if (err) {
            return resolve([err, null])
        }
        resolve([null, 'OK'])
    })
}

/**
 * 获取拦截列表
 * @returns 
 */
export function getBlockList() {
    return customList[2]
}

/**
 * 设置拦截列表
 * @param {array} newBlockList 新的拦截列表
 */
export function setBlockList(newBlockList) {
    return new Promise(async resolve => {
        customList[2] = newBlockList
        const [err, res] = await tools.writeFile(config.BLOCK_FILE, customList[2].join('\n'))
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
 * @param {*} index 索引
 */
export function setMainNode(index) {
    return new Promise(async (resolve) => {
        if (index < 0 || index >= nodes.length) {
            return resolve([new Error('超出范围'), null])
        }
        mainNode = nodes[index]
        // 删除原有proxy节点
        const [err1, res1] = await utils.delOutbound(mainNode.outbound, 'proxy')
        if (err1) {
            console.log(err1)
            return resolve([err1, null])
        }
        // 新增proxy节点
        const [err2, res2] = await utils.addOutbound(mainNode.outbound, 'proxy')
        if (err2) {
            console.log(err2)
            return resolve([err2, null])
        }
        resolve([null, '设置成功'])
    })
}
