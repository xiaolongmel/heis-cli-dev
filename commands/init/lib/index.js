'use strict';

function init(programName, cmdObj)  {

    console.log('init', programName, cmdObj.force, cmdObj.parent.targetPath)
}
module.exports = init;
