import axios from 'axios'
import { createWriteStream } from 'fs'
import * as tools from '../../tools.js'
import * as config from './config.js'

const CancelToken = axios.CancelToken

/**
 * 访问某个URL的耗时
 * @param {string} url URL
 * @param {string} timeout 超时时间
 */
export function getDelay(url, timeout) {
    return new Promise((resolve) => {
        const timeStart = Date.now()
        axios({
            url,
            timeout,
            proxy: {
                host: '127.0.0.1',
                port: 10810
            }
        })
            .then(() => {
                const delay = Date.now() - timeStart
                resolve([null, delay])
            })
            .catch(err => {
                console.log(err.message)
                resolve([err, null])
            })
    })
}

/**
 * 下载某个网络文件的网速
 * @param {string} url URL
 * @param {number} filesize 文件大小MiB
 * @param {string} timeout 超时时间
 */
export function getSpeed(url, filesize, timeout) {
    return new Promise(async (resolve) => {
        let timer
        const writer = createWriteStream('/dev/null')
        const startTime = Date.now()
        const response = await axios({
            url,
            timeout,
            responseType: 'stream',
            proxy: {
                host: '127.0.0.1',
                port: 10810
            }
        }, {
            cancelToken: new CancelToken(function executor(c) {
                timer = setTimeout(() => {
                    c()
                    writer.close()
                    resolve([new Error('太慢了', null)])
                }, timeout)
            })
        })
        response.data.pipe(writer)
        writer.on('finish', () => {
            const time = Date.now() - startTime
            const speed = Number((filesize / time).toFixed(2))
            clearTimeout(timer)
            resolve([null, speed])
        })
        writer.on('error', (err) => {
            writer.close()
            clearTimeout(timer)
            resolve([err, null])
        })

    })
}

/**
 * 解析节点
 * @param {String} string 订阅链接/分享链接
 * @param {String} from 订阅名称/唯一标志
 * @returns {Object}
 */
export function parseNodes(string, from) {
    const nodes = []
    const protocolMap = {
        ss: 'Shadowsocks',
        trojan: 'Trojan',
        vmess: 'VMess'
    }
    const rawNodes = tools.base64Decode(string).split('\n').filter(v => v)
    for (const n of rawNodes) {
        const protocol = protocolMap[n.split('://')[0]]
        if (!protocol) {
            console.log('不支持的分享链接', n.split('://')[0])
            continue
        }
        let name
        let outbound
        if (protocol === 'Shadowsocks') {
            name = decodeURIComponent(n.substring(n.indexOf('#') + 1))
            outbound = generateOutbound('ss', n.substring(5))
        } else if (protocol === 'Trojan') {
            name = decodeURIComponent(n.substring(n.indexOf('#') + 1))
            outbound = generateOutbound('trojan', n.substring(9))
        } else if (protocol === 'VMess') {
            const obj = tools.base64Decode(n.substring(8))
            name = JSON.parse(obj).ps
            outbound = generateOutbound('vmess', obj)
        }
        const inExcludeKeywords = config.EXCLUDE_KEYWORDS.some(v => name.includes(v))
        const inExclude_protocol = config.EXCLUDE_PROTOCOL.includes(protocol)
        if (inExcludeKeywords || inExclude_protocol) {
            console.log('不添加', name, '因为', inExcludeKeywords ? '包含排除关键词' : '', inExclude_protocol ? '属于禁用协议' : '')
            continue
        }
        nodes.push({
            proto: protocol,
            name: replaceName(name),
            from,
            delay: 0,
            speed: 0,
            outbound,
            original: n
        })
    }
    return nodes
}

/**
 * 操作outbound
 * @param {string} action 操作：ado rmo
 * @param {object} outbound 对象
 * @returns 
 */
function doOutbound(action, outbound) {
    return new Promise(async resolve => {
        const c = {
            outbounds: [
                {
                    ...outbound,
                    tag: 'xray-out'
                }
            ]
        }
        const [err1] = await tools.writeFile('/tmp/xraytempfile.json', c)
        if (err1) {
            return resolve([err1, null])
        }
        const [err2] = await tools.exec(config.XRAY_FILE, ['api', action, '--server=127.0.0.1:10807', '/tmp/xraytempfile.json'])
        if (err2) {
            return resolve([err2, null])
        }
        resolve([null, null])
    })
}

/**
 * 删除一个outbound
 * @param {object} outbound 
 * @returns 
 */
export function delOutbound(outbound) {
    return doOutbound('rmo', outbound)
}

/**
 * 增加一个outbound
 * @param {object} outbound 
 * @returns 
 */
export function addOutbound(outbound) {
    return doOutbound('ado', outbound)
}

/**
 * 生成当前outbound配置
 * @param {String} proto 协议名
 * @param {String} sharelink 分享链接
 * @returns {OutboundObject}
 */
function generateOutbound(proto, sharelink) {
    if (proto === 'trojan') {
        return {
            "tag": "proxy",
            "protocol": "trojan",
            "settings": {
                "servers": [
                    {
                        "address": sharelink.substring(37, sharelink.indexOf(':')),
                        "port": parseInt(sharelink.substring(sharelink.indexOf(':') + 1, sharelink.indexOf('#'))),
                        "password": sharelink.substring(0, 36)
                    }
                ]
            },
            "streamSettings": {
                "network": "tcp",
                "security": "tls",
                "sockopt": {
                    "mark": 2
                }
            }
        }
    } else if (proto === 'ss') {
        if (sharelink.indexOf('@') !== -1 && sharelink.indexOf(':') !== -1) {
            const arr = tools.base64Decode(sharelink.substring(0, sharelink.indexOf('@'))).split(':')
            return {
                "tag": "proxy",
                "protocol": "shadowsocks",
                settings: {
                    servers: [
                        {
                            address: sharelink.substring(sharelink.indexOf('@') + 1, sharelink.indexOf(':')),
                            method: arr[0],
                            password: arr[1],
                            port: parseInt(sharelink.substring(sharelink.indexOf(':') + 1, sharelink.indexOf('#')))
                        }
                    ]
                },
                "streamSettings": {
                    "sockopt": {
                        "mark": 2
                    }
                }
            }
        } else {
            const arr2 = tools.base64Decode(sharelink.substring(0, sharelink.indexOf('#'))).split(':')
            return {
                "tag": "proxy",
                "protocol": "shadowsocks",
                settings: {
                    servers: [
                        {
                            address: arr2[1].split('@')[1],
                            method: arr2[0],
                            password: arr2[1].split('@')[0],
                            port: parseInt(arr2[2])
                        }
                    ]
                },
                "streamSettings": {
                    "sockopt": {
                        "mark": 2
                    }
                }
            }
        }
    } else if (proto === 'vmess') {
        sharelink = JSON.parse(sharelink)
        const tmp = {
            "tag": "proxy",
            "protocol": "vmess",
            "settings": {
                "vnext": [
                    {
                        "address": sharelink.add,
                        "port": Number(sharelink.port),
                        "users": [
                            {
                                "id": sharelink.id,
                                "alterId": Number(sharelink.aid),
                                "security": sharelink.scy
                            }
                        ]
                    }
                ]
            },
            "streamSettings": {
                "network": sharelink.net,
                "wsSettings": {
                    "path": sharelink.path
                },
                "sockopt": {
                    "mark": 2
                }
            }
        }
        if (sharelink.tls) {
            tmp.streamSettings.security = sharelink.tls
            tmp.streamSettings.tlsSettings = {
                allowInsecure: false
            }
        }
        if (sharelink.host !== 0) {
            tmp.streamSettings.wsSettings.headers = {
                Host: sharelink.host
            }
        }
        return tmp
    }
}

/**
 * 替换节点中的关键字
 * @param {String} name 节点名称
 * @returns 
 */
function replaceName(name) {
    for (let key in config.REPLACE_KEYWORDS) {
        name = name.replace(key, config.REPLACE_KEYWORDS[key])
    }
    return name
}
