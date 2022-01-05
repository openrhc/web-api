import { readdirSync, existsSync } from 'fs'
import chokidar from 'chokidar'


// watcher
//     .on('add', function (path) { log('File', path, 'has been added'); })
//     .on('addDir', function (path) { log('Directory', path, 'has been added'); })
//     .on('change', async function (path) {
//         const plugin = path.substring('src/plugins/'.length)
//         const module = await import(`./plugins/${plugin}`)
//         app.use(`/${plugin}`, module.default)
//         console.log(`路由 /${plugin} 更新完成，共有 ${module.default.stack.length} 个API`)
//     })
//     .on('unlink', function (path) { log('File', path, 'has been removed'); })
//     .on('unlinkDir', function (path) { log('Directory', path, 'has been removed'); })
//     .on('error', function (error) { log('Error happened', error); })
//     .on('ready', function () { log('Initial scan complete. Ready for changes.'); })
//     .on('raw', function (event, path, details) { log('Raw event info:', event, path, details); })

const plugins = readdirSync('./src/plugins')

async function registerRouter(app) {

    app.all('*', (req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "X-Requested-With")
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS")
        res.header("X-Powered-By", ' 3.2.1')
        next()
    })

    for (const plugin of plugins) {
        if (!existsSync(`./src/plugins/${plugin}/router.js`)) {
            console.log(`插件 ${plugin} 缺少 router.js 文件，请添加。`)
            continue
        }
        const module = await import(`./plugins/${plugin}/router.js`)
        app.use(`/${plugin}`, module.default)
        console.log(`路由 /${plugin} 注册完成，共有 ${module.default.stack.length} 个API`)
    }

    // 监听文件变化，热更新路由文件
    // const watcher = chokidar.watch('./src/plugins', {
    //     ignored: /[\/\\]\./,
    //     persistent: true
    // })

    // watcher
    //     .on('change', async function (path) {
    //         const plugin = path.substring('src/plugins/'.length)
    //         const module = await import(`./plugins/${plugin}`)
    //         console.log(exports)
    //         app.use(`/${plugin}`, module.default)
    //         console.log(`路由 /${plugin} 更新完成，共有 ${module.default.stack.length} 个API`)
    //     })
}

export default registerRouter
