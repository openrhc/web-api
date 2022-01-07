import * as tools from '../../tools.js'
import * as config from './config.js'
import * as utils from './utils.js'

// 订阅列表
let subscribes = []

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

/**
 * 初始化
 */
; (async function () {
    // 读取模板文件
    const [err, data] = await tools.readFile(config.TEMPLATE_FILE)
    if (err) {
        console.log('模板文件丢失，无法正确运行程序')
        throw err
    }
    const str = data.split('\n')
        .filter(v => !v.trim().startsWith('//'))
        .join('\n')
    tpl = JSON.parse(str)
    // 读取自定义分流规则
    const [err1, data1] = await tools.readFile(config.ROUTES_FILE)
    if (err1) {
        console.log(err1)
    } else {
        try {
            routes.push(...JSON.parse(data1))
        } catch (e) {
            console.log(e)
        }
    }
    // 读取订阅列表
    const [err2, data2] = await tools.readFile(config.SUBSCRIBES_FILE)
    if (err2) {
        console.log(err2)
    } else {
        try {
            subscribes.push(...JSON.parse(data2))
        } catch (e) {
            console.log(e)
        }
    }
    // 读取节点列表
    const [err3, data3] = await tools.readFile(config.NODES_FILE)
    if (err3) {
        console.log(err3)
    } else {
        try {
            nodes.push(...JSON.parse(data3))
        } catch (e) {
            console.log(e)
        }
    }
    // 读取直连/代理/拦截列表
    const list = [config.DIRECT_FILE, config.PROXY_FILE, config.BLOCK_FILE]
    for (let i = 0; i < list.length; i++) {
        const [err, data] = await tools.readFile(list[i])
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
    console.log('触发函数: startXray')
    return tools.exec('systemctl', ['start', config.SERVICE_NAME])
}

/*
 * 停止xray服务
 */
export function stopXray() {
    console.log('触发函数: stopXray')
    return tools.exec('systemctl', ['stop', config.SERVICE_NAME])
}

/*
 * 重启xray服务
 */
export function restartXray() {
    console.log('触发函数: ')
    return tools.exec('systemctl', ['restart', config.SERVICE_NAME])
}

/**
 * 获取服务状态
 */
export function statusXray() {
    console.log('触发函数: statusXray')
    return new Promise(async resolve => {
        // 是否在运行
        const [err, isActive] = await tools.exec('systemctl', ['is-active', config.SERVICE_NAME])
        if (err) {
            console.log(err)
            return resolve([err, null])
        }
        // 是否自启动
        const [err1, isEnabled] = await tools.exec('systemctl', ['is-enabled', config.SERVICE_NAME])
        if (err1) {
            console.log(err1)
            return resolve([err1, null])
        }
        // 当前版本
        const [err2, version] = await tools.exec(config.XRAY_FILE, ['version'])
        if (err2) {
            console.log(err2)
            return resolve([err2, null])
        }
        const status = {
            active: isActive.trim() === 'active',
            enabled: isEnabled.trim() === 'enabled',
            version: version.trim().split(' ')[1]
        }
        resolve([null, status])
    })
}

/**
 * 测试节点延迟、网速
 * @param {number} index 索引
 * @returns 
 */
export function testNode(index) {
    console.log('触发函数: testNode')
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
    console.log('触发函数: saveConfig')
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
    console.log('触发函数: setRoute')
    if (i < 0 || i > routes.length) {
        return [new Error('超出范围'), null]
    }
    routes[i] = newRoute
    tools.writeFileDebounce(config.ROUTES_FILE, routes)
    return [null, '设置成功']
}

/**
 * 删除分流规则
 * @param {number} i 索引
 */
export function delRoute(i) {
    console.log('触发函数: delRoute')
    if (i < 0 || i >= routes.length) {
        return [new Error('超出范围'), null]
    }
    routes.splice(i, 1)
    tools.writeFileDebounce(config.ROUTES_FILE, routes)
    return [null, '删除成功，写入成功']
}

/**
 * 分流规则排序
 * @param {number} from 源索引
 * @param {number} to 目标索引
 * @returns 
 */
export function sortRoutes(from, to) {
    console.log('触发函数: sortRoutes')
    if (from < 0 || from >= routes.length || to < 0 || to >= routes.length) {
        return [new Error('超出范围'), null]
    }
    const tmp = routes.splice(from, 1);
    routes.splice(to, 0, ...tmp);
    tools.writeFileDebounce(config.ROUTES_FILE, routes)
    return [null, '排序成功']
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
    console.log('触发函数: setNode')
    if (i < 0 || i > nodes.length) {
        return [new Error('超出范围'), null]
    }
    nodes[i] = newNode
    tools.writeFileDebounce(config.NODES_FILE, nodes)
    return [null, '更新成功']
}

/**
 * 删除节点
 * @param {number} i 索引
 */
export function delNode(i) {
    console.log('触发函数: delNode')
    if (i < 0 || i >= nodes.length) {
        return ['超出范围', null]
    }
    nodes.splice(i, 1)
    tools.writeFileDebounce(config.NODES_FILE, nodes)
    return [null, '删除成功']
}

/**
 * 获取订阅列表
 * @returns 
 */
export function getSubscribes() {
    return subscribes
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
        tools.writeFileDebounce(config.NODES_FILE, nodes)
        resolve([null, '更新成功'])
    })
}

/**
 * 设置订阅
 * @param {number} id 索引
 * @param {object} newSubscribe 新的订阅
 * @returns 
 */
export function setSubscribe(id, newSubscribe) {
    console.log('触发函数: setSubscribe')
    if (id < 0 || id > subscribes.length) {
        return [new Error('超出范围'), null]
    }
    // 更新节点中的from
    if (id !== subscribes.length) {
        const oldname = subscribes[id].name
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].from === oldname) {
                nodes[i].from = newSubscribe.name
            }
        }
    }
    subscribes[id] = newSubscribe
    tools.writeFileDebounce(config.SUBSCRIBES_FILE, subscribes)
    return [null, '设置成功']
}

/**
 * 删除订阅
 * @param {number} i 索引
 */
export function delSubscribe(i) {
    console.log('触发函数: delSubscribe')
    if (i < 0 || i >= subscribes.length) {
        return [new Error('超出范围'), null]
    }
    subscribes.splice(i, 1)
    tools.writeFileDebounce(config.SUBSCRIBES_FILE, subscribes)
    return [null, '删除成功']
}

/**
 * 清空订阅
 * @param {number} i 索引
 */
export function emptySubscribe(i) {
    console.log('触发函数: emptySubscribe')
    if (i < 0 || i >= subscribes.length) {
        return [new Error('超出范围'), null]
    }
    nodes = nodes.filter(v => v.from !== subscribes[i].name)
    tools.writeFileDebounce(config.NODES_FILE, nodes)
    return [null, '清空成功，写入成功']
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
    console.log('触发函数: setDirectList')
    customList[0] = newDirectList
    tools.writeFileDebounce(config.DIRECT_FILE, customList[0].join('\n'))
    return [null, 'OK']
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
    console.log('触发函数: setProxyList')
    customList[1] = newProxyList
    tools.writeFileDebounce(config.PROXY_FILE, customList[1].join('\n'))
    return [null, 'OK']
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
    console.log('触发函数: setBlockList')
    customList[2] = newBlockList
    tools.writeFileDebounce(config.BLOCK_FILE, customList[2].join('\n'))
    return [null, 'OK']
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
    console.log('触发函数: setMainNode')
    return new Promise(async (resolve) => {
        if (index < 0 || index >= nodes.length) {
            return resolve([new Error('超出范围'), null])
        }
        // 去除旧的mainNode上的active属性
        delete mainNode.active
        mainNode = nodes[index]
        // 为新的mainNode增加active属性
        mainNode.active = true
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
        tools.writeFileDebounce(config.NODES_FILE, nodes)
        resolve([null, '设置成功'])
    })
}
