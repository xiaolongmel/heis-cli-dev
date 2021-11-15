'use strict';


const  inquirer = require('inquirer')
const fs = require('fs')
const fse = require('fs-extra')
const semver = require('semver')
const log = require('@heis-cli-dev/log')
const Command = require('@heis-cli-dev/command')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

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
    async exec() {
        try { // 1.准备阶段
            const ret = await this.prepare()
            if(ret) {

                // 2.下载模板
                // 3.安装模板
            }
        } catch (e) {
            log.error(e.message)
        }
    }

    async prepare() {
        // 1.判断当前目录是否为空
        const localPath = process.cwd()
        let ifContinue = false
        if(!this.ifDirEmpty(localPath)) {
            if(!this.force) {
                // 2.是否启动强制更新
                ifContinue = (await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    default: false,
                    message: '当前文件夹不能为空，是否继续创建项目?'
                })).ifContinue
                if(!ifContinue) {
                    return
                }
            }

            if(ifContinue || this.force) {
                // 给用户做二次确认
                const {confirmDelete} = await inquirer.prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    default: false,
                    message: '是否确认清空当前目录下的文件?'
                })
                if(confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath)
                }

            }
        }
        return this.getProjectInfo()


    }

    async getProjectInfo() {
        const projectInfo = {}
        // 1.选择创建项目或组件
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT
            }, {
                name: '组件',
                value: TYPE_COMPONENT
            }]
        })
        log.verbose('type', type)

        if (type === TYPE_PROJECT) {
            // 2.获取项目的基本信息
            const o = await inquirer.prompt([{
                type: 'input',
                name: 'projectName',
                message: '请输入项目名称',
                default: '',
                validate: function (v) {

                    // Declare function as asynchronous, and save the done callback
                    var done = this.async();

                    // Do async stuff
                    setTimeout(function() {
                        // 1.输入的首字符为英文字符
                        // 2.尾字符必须为英文字符,不能为字符
                        // 3.字符仅允许"_"
                        // 合法: a, a-b, a_b, a-b-c, a_b_c, a-b1-c1, a_b1_c1
                        // 不合法: 1, a_, a-, a_1, a-1
                        // *表示匹配0次到多次
                        if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                            // Pass the return value in the done callback
                            done('请输入合法的项目名称');
                            return;
                        }
                        // Pass the return value in the done callback
                        done(null, true);
                    }, 0);

                },
                filter: function (v) {
                    return v
                }
            }, {
                type: 'input',
                name: "projectVersion",
                message: '请输入项目版本号',
                default: '1.0.0',
                validate: function (v) {

                    var done = this.async();

                    // Do async stuff
                    setTimeout(function() {
                        if (!(!!semver.valid(v))) {
                            done('请输入合法的版本号');
                            return;
                        }
                        done(null, true);
                    }, 0);
                },
                filter: function (v) {

                    if(!!semver.valid(v)) {
                        return semver.valid(v)
                    } else {
                        return v
                    }

                }
            }])

        } else if(type === TYPE_COMPONENT) {

        }
        // return 项目的基本信息 (object)
        return projectInfo
    }



    ifDirEmpty(localPath) {
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
