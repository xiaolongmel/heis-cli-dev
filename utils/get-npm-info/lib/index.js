'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo(npmName, registry) {
    if(!npmName) {
        return null
    }
    const registryUrl = registry || getDefaultRegistry()
    const npmInfoUrl = urlJoin(registryUrl, npmName)
    return axios.get(npmInfoUrl).then(response => {
        if(response.status === 200) {
            return response.data
        } else {
            return null
        }

    }).catch(err => {
        return Promise.resolve(err)
    })
}

function getDefaultRegistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

async function getNpmVersions(npmName, registry) {
    const data = await getNpmInfo(npmName, registry)
    if(data) {
        return Object.keys(data.versions)
    } else {
        return []
    }
}

// 返回满足当前条件的版本号
function getSemverVersions(baseVersion, versions) {
    return versions
        .filter(version => semver.satisfies(version, `^${baseVersion}`))
        .sort((a, b) => semver.gt(b, a)); // 倒序排序，大版本在前

}

// 获取最新版本号
async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersions(npmName, registry)
    const newVersions = getSemverVersions(baseVersion, versions)
    if (newVersions && newVersions.length > 0) {
        return newVersions[0]
    }
}

async function getNpmLatestVersion(npmName, registry) {
    let versions = await getNpmVersions(npmName, registry)
    if(versions) {
        return versions.sort((a, b) => semver.gt(b, a))[0];
    }
    return null

}
module.exports = {
    getNpmLatestVersion,
    getNpmInfo,
    getNpmVersions,
    getNpmSemverVersion,
    getDefaultRegistry
}

