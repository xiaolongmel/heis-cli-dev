'use strict';

const path = require('path')
const pkgDir = require('pkg-dir').sync
const fse = require('fs-extra')
const npminstall = require('npminstall')
const {isObject} = require('@heis-cli-dev/utils')
const pathExists = require('path-exists').sync
const formatPath = require('@heis-cli-dev/format-path')
const {getDefaultRegistry, getNpmLatestVersion} = require('@heis-cli-dev/get-npm-info')

class Package {
    constructor(options) {
        if (!options) {
            throw new Error('Package的options参数不能为空')
        }
        if (!isObject(options)) {
            throw new Error('Package的options参数必须为对象')
        }
        // package的路径
        this.targetPath = options.targetPath
        // 缓存package的路径
        this.storeDir = options.storeDir
        // package的name
        this.packageName = options.packageName
        // package的version
        this.packageVersion = options.packageVersion
        // package的缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '_')
    }

    async prepare() {
        // 如果缓存目录不存在，则创建
        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir)
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName)
        }
        // _@imooc-cli_init@1.1.2@@imooc-cli
        // @imooc-cli/init 1.2.2
        //
    }

    get cacheFilePath() {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
    }

    getSpecificCacheFilePath(packageVersion) {
        return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
    }

    // 判断当前Package是否存在
    async exists() {
        if (this.storeDir) {
            await this.prepare()
            return pathExists(this.cacheFilePath)
        } else {
            return pathExists(this.targetPath)
        }
    }

    // 安装Package
    async install() {
        await this.prepare()
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [
                {
                    name: this.packageName,
                    version: this.packageVersion
                },
            ],
        })
    }

    // 更新Package
    async update() {
        await this.prepare()
        // 1.获取最新的npm版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName)
        // 2.查询最新版本号对应的路径存不存在
        const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
        // 3.如果不存在，则直接安装最新版本
        if (!pathExists(latestFilePath)) {
            await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [
                    {
                        name: this.packageName,
                        version: latestPackageVersion
                    },
                ],
            })
            this.packageVersion = latestPackageVersion
        } else {
            this.packageVersion = latestPackageVersion;
        }

    }

    // 获取入口文件的地址
    getRootFilePath() {
        function _getRootFile(targetPath) {
            // 1.获取package.json所在目录 - pkg-dir
            const dir = pkgDir(targetPath)
            if (dir) {
                // 2.读取package.json - require()
                const pkgFile = require(path.resolve(dir, 'package.json'))
                // 3.main/lib - path
                if (pkgFile && pkgFile.main) {
                    // 4.路径的兼容(macOS/windows)
                    return formatPath(path.resolve(dir, pkgFile.main))
                }

            }
            return null
        }

        if (this.storeDir) {
            return _getRootFile(this.cacheFilePath)
        } else {
            return _getRootFile(this.targetPath)
        }


    }
}

module.exports = Package
