'use strict';

function init(programName, cmdObj)  {
    console.log('init', programName, cmdObj.force, process.env.CLI_TARGET_PATH)
}
module.exports = init;
