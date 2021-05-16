/** 打包所有子包 */
const fs = require("fs");
const execa = require("execa");

const packagetDirNames = fs.readdirSync("packages").filter(child => {
    if (!fs.statSync(`packages/${child}`).isDirectory()) {
        // 非目录
        return false
    }
    return true;
});

/**
 * 子进程执行rullup打包对应dir目录的资源
 * @param {*} targetDirName 目录名
 */
async function build(targetDirName) {
  // 每个目录起一个子进程跑 rollup 打包对应的目录
  // rollup -c --environment TARGET:子项目目录名
  // { stdout: "inherit" } 子进程打包信息共享给父进程的配置
  // 传值给 rollup 配置信息
  console.log("子项-目录名: ", targetDirName);
  await execa("rollup", ["-c", "--environment", `TARGET:${targetDirName}`], { stdout: "inherit" })
}

/**
 * 并行
 * @param {*} dirNames 目录名数组
 * @param {*} build 执行函数
 * @returns 
 */
function runAll(dirNames, build) {
  // promise收集
  let execs = [];
  let temp = null;
  for(let dirName of dirNames) {
    temp = build(dirName);
    execs.push(temp);
  }
  temp = null;
  return Promise.all(execs);
}

runAll(packagetDirNames, build);
