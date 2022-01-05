import { spawn } from 'child_process'
import { readFile as read, writeFile as write } from 'fs'
import axios from 'axios'

/**
 * 执行系统命令并返回结果
 * @param {String} command 命令字符串
 * @param {Array} args 参数数组
 * @returns 
 */
export function exec(command = '', args = []) {
    return new Promise((resolve, reject) => {
        const result = spawn(command, args)
        let errStr = ''
        let outStr = ''
        result.stdout.on('data', data => {
            outStr += data
        })
        result.stderr.on('data', data => {
            errStr += data
        })
        result.on('error', err => {
            resolve([err, null])
        })
        result.on('close', (code) => {
            if (code !== 0) {
                return resolve([new Error(errStr), null])
            }
            resolve([null, outStr])
        })
    })
}

/**
 * 执行axios.get方法
 * @param {string} url URL
 * @param {object} params 请求参数
 * @returns 
 */
export function axiosGet(url = '', params = {}) {
    return new Promise(resolve => {
        axios.get(url, { params }).then(res => {
            resolve([null, res.data])
        }).catch(err => {
            resolve([err, null])
        })
    })
}

/**
 * 暂停N毫秒
 * @param {Number} n 毫秒
 * @returns 
 */
export function sleep(n = 100) {
    return new Promise(resolve => setTimeout(() => resolve(), n))
}

/**
 * 解码Base64字符串
 * @param {String} str 欲解码字符串
 * @returns 
 */
export function base64Decode(str = '') {
    return (new Buffer.from(str, 'base64')).toString()
}

/**
 * Promise封装的读取文件操作
 * @param {String} file 文件路径
 */
export function readFile(file = '') {
    return new Promise((resolve, reject) => {
        read(file, 'utf8', (err, data) => {
            if (err) {
                return resolve([err, null])
            }
            resolve([null, data])
        })
    })
}


/**
 * Promise封装的写入文件操作
 * @param {String} file 文件路径
 * @param {String} data 文件内容
 */
export function writeFile(file = '', data) {
    if (typeof data !== 'string') {
        data = JSON.stringify(data, null, 2)
    }
    return new Promise((resolve, reject) => {
        write(file, data, 'utf8', err => {
            if (err) {
                return reject([err, null])
            }
            resolve([null, null])
        })
    })
}
