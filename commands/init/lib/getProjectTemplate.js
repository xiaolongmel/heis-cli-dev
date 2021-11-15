const request = require('@heis-cli-dev/request')

module.exports = function () {
    return request({
        url: '/project/template'
    })
}
