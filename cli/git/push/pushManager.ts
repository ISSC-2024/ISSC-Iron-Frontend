import chalk from 'chalk'
import { exec } from 'node:child_process'
import util from 'node:util'
const asyncExec = util.promisify(exec)
const { log } = console

const pushState = {
    currentBranch: '',
}

export default {
    prepare: {
        async getBranch() {
            //获取当前的开发分支名称
            try {
                const { stdout } = await asyncExec('git rev-parse --abbrev-ref HEAD')
                pushState.currentBranch = stdout.replace('\n', '')
            } catch (error) {
                log(chalk.red('获取当前分支发生错误'))
                log(chalk.red(error))
                process.exit(1)
            }
        },
        async mergeLatestMaster() {
            //与远程main保持同步
            const { currentBranch } = pushState
            try {
                //切换到main分支
                await asyncExec('git checkout main')
            } catch (error) {
                log(chalk.red('git checkout main失败,请检查工作区和暂存区是否有文件没有commit'))
                log(chalk.red(error))
                process.exit(1)
            }

            try {
                //拉取远程的main分支
                await asyncExec('git pull origin main')
            } catch (error) {
                log(error)
                log(
                    chalk.red(
                        'git pull origin main，原因可能为网络不稳定或者远程main与本地main存在冲突等, 现切换回原开发分支, 随后应手动切换main分支并拉取远程更新',
                        error,
                    ),
                )
                try {
                    //切换回原先分支, git checkout -f会抛弃从远程main拉取的更新
                    await asyncExec(`git checkout -f ${currentBranch}`)
                    process.exit(1)
                } catch (error) {
                    log(chalk.red(`git checkout -f ${pushState.currentBranch}切换回原先开发分支失败`))
                    log(chalk.red(error))
                    process.exit(1)
                }
            }

            try {
                //切换至原分支
                await asyncExec(`git checkout ${currentBranch}`)
            } catch (error) {
                log(chalk.red(`git checkout ${pushState.currentBranch}切换回原先开发分支失败,目前处在main分支`))
                log(chalk.red(error))
                process.exit(1)
            }

            try {
                //合并最新main
                await asyncExec(`git merge main`)
                log(chalk.blue('成功合并main分支, 当前开发分支已和远程main同步'))
            } catch (error) {
                chalk.red(`git merge main执行失败, 原因可能是存在冲突, 请手动解决冲突再执行npm run push`),
                    log(chalk.red(error))
                process.exit(1)
            }
        },
    },
    gitCommand: {
        gitPush() {
            //执行git push命令
            const { currentBranch } = pushState
            try {
                asyncExec(`git push --set-upstream origin ${currentBranch} --no-verify`)
                log(chalk.yellow('代码提交成功'))
                log(
                    chalk.yellow(
                        `当前分支对应的远程仓库地址(ctrl+鼠标点击下方链接可直接在浏览器打开):\n https://github.com/ISSC-2024/ISSC-Iron-Frontend/tree/${currentBranch}`,
                    ),
                )
            } catch (error) {
                log(chalk.red('git push发生错误'))
                log(chalk.red(error))
                process.exit(1)
            }
        },
    },
}