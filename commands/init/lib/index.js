'use strict';

const path = require('path')
const inquirer = require('inquirer')
const fs = require('fs')
const ejs = require('ejs')
const glob = require('glob')
const fse = require('fs-extra')
const semver = require('semver')
const userHome = require('user-home')
const log = require('@heis-cli-dev/log')
const Command = require('@heis-cli-dev/command')
const Package = require('@heis-cli-dev/package')
const {spinnerStart, sleep, execAsync} = require('@heis-cli-dev/utils')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'

const WHITE_COMMAND = ['npm', 'cnpm'];

function init(argv) {
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
            const projectInfo = await this.prepare()
            if (projectInfo) {
                // 2.下载模板
                log.verbose('projectInfo', projectInfo)
                this.projectInfo = projectInfo
                await this.downloadTemplate()
                // 3.安装模板
                await this.installTemplate()
            }
        } catch (e) {
            log.error(e.message)
            if (process.env.LOG_LEVEL === 'verbose') {
                console.log(e)
            }
        }
    }

    async installTemplate() {
        if (this.templateInfo) {
            if (!this.templateInfo.type) {
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL
            }
            if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
                // 标准安装
                this.installNormalTemplate()
            } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
                // 自定义安装
                this.installCustomTemplate()
            } else {
                throw new Error('无法识别项目模板类型!')
            }
        } else {
            throw new Error('项目模板信息不存在!')
        }

    }

    checkCommand(cmd) {
        if (WHITE_COMMAND.includes(cmd)) {
            return cmd;
        }
        return null;
    }

    async execCommand(command, errMsg) {
        let ret;
        if (command) {
            const cmdArray = command.split(' ');
            const cmd = this.checkCommand(cmdArray[0]);
            if (!cmd) {
                throw new Error('命令不存在！命令：' + command);
            }
            const args = cmdArray.slice(1);
            ret = await execAsync(cmd, args, {
                stdio: 'inherit',
                cwd: process.cwd(),
            });
        }
        if (ret !== 0) {
            throw new Error(errMsg);
        }
        return ret;
    }

    // ejs模板渲染
    async ejsRender(options) {
        const dir = process.cwd()
        const projectInfo = this.projectInfo

        return new Promise((resolve, reject) => {
            glob('**', {
                cwd: dir,
                ignore: options.ignore || '',
                nodir: true // 排除文件夹
            }, (err, files) => {
                if (err) {
                    reject(err)
                }
                Promise.all(files.map(file => {
                    const filePath = path.join(dir, file)
                    return new Promise((resolve1, reject1) => {
                        ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                            if (err) {
                                reject1(err)
                            } else {
                                // renderFile只会将当前ejs模板文件渲染成字符串，而不会执行写入操作
                                fs.writeFileSync(filePath, result)
                                resolve(result)
                            }
                        })
                    })
                })).then(() => {
                    resolve()
                }).catch(err => {
                    reject(err)
                })
            })
        })
    }

    async installNormalTemplate() {
        log.verbose('templateNpm', this.templateNpm);
        const spinner = spinnerStart("正在安装模板")
        await sleep()
        try {
            // 拷贝模板代码至当前目录
            const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
            const targetPath = process.cwd()
            fse.ensureDirSync(templatePath)
            fse.ensureDirSync(targetPath)
            fse.copySync(templatePath, targetPath)
        } catch (e) {
            throw e
        } finally {
            spinner.stop(true)
            log.success('模板安装成功')
        }
        const templateInfo = this.templateInfo.ignore || []
        const ignore = ['node_modules/**', ...templateInfo]
        await this.ejsRender({ignore})
        // 依赖安装
        const {installCommand, startCommand} = this.templateInfo
        // 依赖安装
        await this.execCommand(installCommand, '依赖安装失败！');
        // 启动命令执行
        await this.execCommand(startCommand, '启动执行命令失败！');


    }

    async installCustomTemplate() {
        // 查询自定义模板的入口文件
       if (await this.templateNpm.exists()) {
           const rootFile = this.templateNpm.getRootFilePath()
           if (fs.existsSync(rootFile)) {
               log.notice('开始执行自定义模板')
               const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
               const options = {
                   templateInfo: this.templateInfo,
                   projectInfo: this.projectInfo,
                   sourcePath: templatePath,
                   targetPath: process.cwd(),
               };
               const code = `require('${rootFile}')(${JSON.stringify(options)})`
               log.verbose('code', code)
               await execAsync('node', ['-e', code], {
                   stdio: 'inherit',
                   cwd: process.cwd()
               })
               log.success('自定义模板安装成功')
           } else {
               throw new Error('自定义模板入口文件不存在')
           }
       }
    }

    async downloadTemplate() {
        const {projectTemplate} = this.projectInfo
        const templateInfo = this.template.find(item => item.npmName === projectTemplate)
        const targetPath = path.resolve(userHome, '.heis-cli-dev', 'template')
        const storeDir = path.resolve(userHome, '.heis-cli-dev', 'template', 'node_modules')
        const {npmName, version} = templateInfo
        this.templateInfo = templateInfo
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version
        })
        if (!await templateNpm.exists()) {
            const spinner = spinnerStart('正在下载模板...')
            await sleep()
            try {
                await templateNpm.install()
            } catch (e) {
                throw e
            } finally {
                spinner.stop(true)
                if (await templateNpm.exists()) {
                    log.success('下载模板成功')
                    this.templateNpm = templateNpm
                }

            }


        } else {
            const spinner = spinnerStart('正在更新模板...')
            await sleep()
            try {
                await templateNpm.update()
            } catch (e) {
                throw new Error(e)
            } finally {
                spinner.stop(true)
                if (await templateNpm.exists()) {
                    log.success('更新模板成功')
                    this.templateNpm = templateNpm
                }
            }
        }

        // 1.通过项目模板API获取项目模板信息
        // 1.1 通过egg.js搭建一套后台系统
        // 1.2 通过npm存储项目模板
        // 1.3 将项目模板信息存储到mongodb数据库中
        // 1.4 通过egg.js获取mongodb中的数据并通过API返回
    }

    async prepare() {
        // 0.判断项目模板是否存在
        const template = await getProjectTemplate()
        if (!template || template.length === 0) {
            throw new Error('项目模板不存在')
        }
        this.template = template
        // 1.判断当前目录是否为空
        const localPath = process.cwd()
        let ifContinue = false
        if (!this.ifDirEmpty(localPath)) {
            if (!this.force) {
                // 2.是否启动强制更新
                ifContinue = (await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    default: false,
                    message: '当前文件夹不能为空，是否继续创建项目?'
                })).ifContinue
                if (!ifContinue) {
                    return
                }
            }

            if (ifContinue || this.force) {
                // 给用户做二次确认
                const {confirmDelete} = await inquirer.prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    default: false,
                    message: '是否确认清空当前目录下的文件?'
                })
                if (confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath)
                }

            }
        }
        return this.getProjectInfo()


    }

    async getProjectInfo() {
        // 1.输入的首字符为英文字符
        // 2.尾字符必须为英文字符,不能为字符
        // 3.字符仅允许"_"
        // 合法: a, a-b, a_b, a-b-c, a_b_c, a-b1-c1, a_b1_c1
        // 不合法: 1, a_, a-, a_1, a-1
        // *表示匹配0次到多次
        function isValidName(v) {
            return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
        }

        let projectInfo = {}
        let isProjectNameValid = false
        if (isValidName(this.projectName)) {
            isProjectNameValid = true
            projectInfo.projectName = this.projectName
        }

        // 1.选择创建项目或组件
        const {type} = await inquirer.prompt({
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
        // 根据选择过滤模板列表
        this.template = this.template.filter(t => t.tag.includes(type))
        const title = type === TYPE_PROJECT ? '项目' : '组件'
        const projectNamePrompt = {
            type: 'input',
            name: 'projectName',
            message: `请输入${title}名称`,
            default: '',
            validate: function (v) {

                // Declare function as asynchronous, and save the done callback
                var done = this.async();

                // Do async stuff
                setTimeout(function () {

                    if (!isValidName(v)) {
                        // Pass the return value in the done callback
                        done(`请输入合法的${title}名称`);
                        return;
                    }
                    // Pass the return value in the done callback
                    done(null, true);
                }, 0);

            },
            filter: function (v) {
                return v
            }
        }
        const projectPrompt = []
        if (!isProjectNameValid) {
            projectPrompt.push(projectNamePrompt)
        }
        projectPrompt.push({
            type: 'input',
            name: "projectVersion",
            message: `请输入${title}版本号`,
            default: '1.0.0',
            validate: function (v) {

                var done = this.async();

                // Do async stuff
                setTimeout(function () {
                    if (!(!!semver.valid(v))) {
                        done('请输入合法的版本号');
                        return;
                    }
                    done(null, true);
                }, 0);
            },
            filter: function (v) {

                if (!!semver.valid(v)) {
                    return semver.valid(v)
                } else {
                    return v
                }

            }
        }, {
            type: 'list',
            name: 'projectTemplate',
            message: `请选择${title}模板`,
            choices: this.createTemplateChoice()
        })
        if (type === TYPE_PROJECT) {

            // 2.获取项目基本信息
            const project = await inquirer.prompt(projectPrompt)
            projectInfo = {
                ...projectInfo,
                type,
                ...project
            }


        } else if (type === TYPE_COMPONENT) {
            const descriptionPrompt = {
                type: 'input',
                name: "componentDescription",
                message: '请输入组件描述信息',
                default: '',
                validate: function (v) {

                    var done = this.async();

                    // Do async stuff
                    setTimeout(function () {
                        if (!v) {
                            done('请输入组件描述信息');
                            return;
                        }
                        done(null, true);
                    }, 0);
                }
            }
            projectPrompt.push(descriptionPrompt)
            // 2.获取组件基本信息
            const component = await inquirer.prompt(projectPrompt)
            projectInfo = {
                ...projectInfo,
                type,
                ...component
            }
        }

        // AbcEfg => abc-efg
        // 生产className
        if (projectInfo.projectName) {
            projectInfo.name = projectInfo.projectName;
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
        }
        if (projectInfo.projectVersion) {
            projectInfo.version = projectInfo.projectVersion
        }
        if (projectInfo.componentDescription) {
            projectInfo.description = projectInfo.componentDescription
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

    createTemplateChoice() {
        return this.template.map(item => ({
            value: item.npmName,
            name: item.name
        }))
    }
}


module.exports = init
module.exports.InitCommand = InitCommand;
