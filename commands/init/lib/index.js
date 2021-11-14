'use strict';


const Command = require('@heis-cli-dev/command')
const log = require('@heis-cli-dev/log')
const fs = require('fs')

function init(argv)  {
    // console.log('init', programName, cmdObj.force, process.env.CLI_TARGET_PATH)
    return new InitCommand(argv)
}

class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || ''
        this.force = this._cmd.force
        log.verbose('projectName', this.projectName)
        log.verbose('force', this.force)
    }
    execute() {
        try { // 1.准备阶段
            this.prepare()
            // 2.下载模板
            // 3.安装模板
        } catch (e) {
            log.error(e.message)
        }
    }

    prepare() {
        // 1.判断当前目录是否为空

        if(!this.ifDirIsEmpty()) {
            // 1.1询问是否继续创建
        }
        console.log(ret)
        // 2.是否开启强制更新
        // 3.选择创建项目或组件
        // 4.获取项目的基本信息
    }

    ifDirIsEmpty() {
        const localPath = process.cwd()
        let fileList = fs.readdirSync(localPath)
        // 文件过滤逻辑
        fileList = fileList.filter(file => (
            !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
        ))
        return !fileList || fileList.length <= 0
    }
}


module.exports = init
module.exports.InitCommand = InitCommand;
