/** 单项打包 */
const execa = require("execa");

let packageName = null;

try {
  packageName = process.argv[2].split('=')[1].trim();
} catch (error) {
  throw new Error("指令未传入 name=包名 配置, " + error);
}

/**
 * 子进程执行rullup打包对应dir目录的资源
 * @param {*} packageName 目录名
 */
async function build(packageName) {
  // 每个目录起一个子进程跑 rollup 打包对应的目录
  // rollup -c --environment TARGET:子项目目录名
  // { stdout: "inherit" } 子进程打包信息共享给父进程的配置
  // 传值给 rollup 配置信息
  await execa("rollup", ["-c", "--environment", `TARGET:${packageName}`], { stdout: "inherit" })
}

build(packageName);
