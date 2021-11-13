'use strict';

module.exports = core;

const path = require('path')
const semver = require('semver')
const commander = require('commander')
const colors = require('colors/safe')
const userHome = require('user-home')
const pathExists = require('path-exists').sync
const log = require('@heis-cli-dev/log')
const exec = require('@heis-cli-dev/exec')


const constant = require('./const')
const pkg = require('../package.json')

let args;

const program = new commander.Command();


async function core() {

    try {
        await prepare()
        registerCommand()
    } catch (e) {
        log.error(e.message)
        if(program.debug) {

            console.log(e)
        }
    }
}

/**
 *
 */
function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d --debug', '是否开启调试模式', false)
        .option('-tp --targetPath <targetPath>', '是否指定本地调式文件路径', '')

    //开启debug模式
    program.on('option:debug', function () {
        if (program.debug) {
            process.env.LOG_LEVEL = 'verbose'
        } else {
            process.env.LOG_LEVEL = 'info'
        }
        log.level = process.env.LOG_LEVEL
        log.verbose('test')
    })

    // 指定targetPath
    program.on('option:targetPath', function () {
        process.env.CLI_TARGET_PATH = program.targetPath
    })

    program
        .command('init [projectName]')
        .option('-f --force', '是否强制初始化项目')
        .action(exec)


    // 注册未知命令
    program.on('command:*', function (obj) {
        const availableCommands = program.commands.map(cmd => cmd.name())
        console.log(colors.red('未知的命令: ' + obj[0]))
        if (availableCommands.length > 0) {
            console.log(colors.red('可用命令: ' + availableCommands.join(',')))
        }
    })
    program.parse(process.argv)

    if (program.args && program.args.length < 1) {
        console.log(program.args)
        program.outputHelp();

    }
}

async function prepare() {
    checkPkgVersion()

    checkRoot()
    checkUserHome()
    checkEnv()
    await checkGlobalUpdate()
}


async function checkGlobalUpdate() {
    // 1.获取当前版本号和模块名
    const currentVersion = pkg.version
    const npmName = pkg.name
    // 2.调用npm API, 获取所有版本号
    // 3.提取所有版本号，比对哪些版本是大于当前版本号
    // 4.获取最新的版本号
    const {getNpmSemverVersion} = require('@heis-cli-dev/get-npm-info')
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName)
    // 5.提示用户更新到该版本
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn('更新提示', colors.yellow(`请手动更新 ${npmName}, 当前版本: ${currentVersion}, 最新版本: ${lastVersion}
        更新命令: npm install -g ${npmName}`))
    }
}

function checkEnv() {
    const dotenv = require('dotenv')
    const dotenvPath = path.resolve(userHome, '.env')
    if (pathExists(dotenvPath)) {

        dotenv.config({
            path: dotenvPath
        })
    }
    createDefaultConfig();
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome
}


function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在'))
    }
}

function checkRoot() {
    const rootCheck = require('root-check')
    rootCheck()
}

function checkPkgVersion() {

    log.notice('cli', pkg.version)
}
