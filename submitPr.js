const { writeFile, unlink } = require('fs').promises
const { join } = require('path')

const { GitProcess } = require('dugite')

const { ISSUE_NUMBER, ISSUE_BODY, GITHUB_TOKEN, GITHUB_ACTOR } = process.env

const branchName = `submit-${ISSUE_NUMBER}`

const remote = `https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/dd-center/vdb.git`

const gitExec = async (...params) => {
  const { stdout } = await GitProcess.exec(params, process.cwd())
  console.log(stdout)
}

;

(async () => {
  await gitExec('branch', branchName)
  await gitExec('checkout', branchName)
  const block = ISSUE_BODY.split('-----END SUBMIT BLOCK-----')[0].split('-----BEGIN SUBMIT BLOCK-----')[1]
  if (block) {
    await String(Buffer.from(block, 'base64'))
      .split('\n')
      .map(command => command.split(':'))
      .map(([command, filename, base64 = '']) => [command, join('vtbs', filename), String(Buffer.from(base64, 'base64'))])
      .map(([command, path, content]) => async () => {
        if (command === 'delete') {
          await unlink(path)
          console.log('delete', path)
        }
        if (command === 'put') {
          await writeFile(path, content)
          console.log('put', path)
        }
      })
      .reduce((p, f) => p.then(f), Promise.resolve())
    await gitExec('commit', '-am', 'update', '-m', `close #${ISSUE_NUMBER}`)
    await gitExec('push', '--set-upstream', remote, branchName)
  }
})()
