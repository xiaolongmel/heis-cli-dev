'use strict';


const Command = require('@heis-cli-dev/command')
const log = require('@heis-cli-dev/log')

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
        console.log('init的业务逻辑')
    }
}


module.exports = init
module.exports.InitCommand = InitCommand;
