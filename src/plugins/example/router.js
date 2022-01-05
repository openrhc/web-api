// 1. (*) 导入Router
import { Router } from 'express'

// 1.1 (可选) 导入公共的工具类
import { sleep } from '../../tools.js'

// 1.2 (可选) 导入自己的工具类
import { Hello } from './utils.js'

Hello()

// 2. (*) 创建router
const router = Router()

// 3. 处理路由
router.get('/', (req, res, next) => {
    // 4. 业务处理（同步）
    const result = {
        code: 0,
        msg: 'sync api'
    }
    // 5. 返回结果
    res.json(result)
})

// 3. 处理路由
router.get('/async123', async (req, res, next) => {
    // 4. 业务处理（异步）
    await sleep(3000)
    const result = {
        code: 0,
        msg: 'async api'
    }
    // 5. 返回结果
    res.json(result)
})

export default router