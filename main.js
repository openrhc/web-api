import express from 'express'
import bodyParser from 'body-parser'
import { networkInterfaces } from 'os'

import registerRouter from './src/router.js'

const WEB_PORT = 7788
const app = express()

app.use(express.static('public'))
app.use(bodyParser.json())

// 注册路由
await registerRouter(app)

app.listen(WEB_PORT, () => {
    console.log(`\nApp running at:`)
    const networks = networkInterfaces()
    Object.values(networks).forEach(interfaces => {
        const address = interfaces.find(v => v.family === 'IPv4').address
        console.log(`   - http://${address}:${WEB_PORT}/`)
    })
})
