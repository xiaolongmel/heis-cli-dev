'use strict';

const Package = require('@heis-cli-dev/package')
const path = require('path')
const log = require('@heis-cli-dev/log')

const SETTINGS = {
    init: '@imooc-cli/init'
}

const CACHE_DIR = 'dependencies'

module.exports = exec;

async function exec() {
    let targetPath = process.env.CLI_TARGET_PATH
    const homePath = process.env.CLI_HOME_PATH
    let storeDir = ''
    let pkg
    log.verbose('targetPath', targetPath)
    log.verbose('homePath', homePath)

    const cmdObj = arguments[arguments.length = 1]
    const cmdName = cmdObj.name()
    const packageName = SETTINGS[cmdName]
    const packageVersion = 'latest'

    // package的存储路径
    if (!targetPath) {
        // 生成缓存路径
        targetPath = path.resolve(homePath, CACHE_DIR)
        storeDir = path.resolve(targetPath, 'node_modules')
        log.verbose('targetPath', targetPath)
        log.verbose('storeDir', storeDir)
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion,

        })
        if (await pkg.exists()) {
            // 更新package
            await pkg.update()
        } else {
            // 安装package
            await pkg.install()
            pkg = new Package({
                targetPath,
                packageName,
                packageVersion,

            })

        }
        const rootFile = pkg.getRootFilePath()
        if(rootFile) {
            require(rootFile).apply(null, [arguments[0], arguments[1]])
        }
    }







}
