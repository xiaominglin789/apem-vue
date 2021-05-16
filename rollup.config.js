import { resolve } from "path";
import json from "@rollup/plugin-json";
import ts from "rollup-plugin-typescript2";
import nodeResolve from "@rollup/plugin-node-resolve";

/** 获取进程的target目录名 */
const targetDirName = process.env.TARGET;

/** 当前子项目的目录 */
const targetPath = resolve(__dirname, "packages", targetDirName);
console.log("子项目路径: ", targetPath);

/** 拼接-当前子项目的目录下的 package.json 路径 */
const targetPathJSONConfPath = resolve(targetPath, "package.json");

/** 导入对应的json配置 */
const pkg = require(targetPathJSONConfPath);

/** 打包的输出配置映射表 */
const outputConfig = {
  "esm-bundler": {
    file: resolve(targetPath, `dist/${targetDirName}.esm-bundler.js`),
    format: "es"
  },
  "cjs": {
    file: resolve(targetPath, `dist/${targetDirName}.cjs.js`),
    format: "cjs"
  },
  "global": {
    file: resolve(targetPath, `dist/${targetDirName}.global.js`),
    format: "iife" // 立即执行
  },
}

/** 获取.json自定义的buildOptions选项 */ 
const buildOptions = pkg.buildOptions;
console.log(buildOptions.formats);

/** 组合打包配置信息 */
function createBuildConfig(output) {
  output.name = buildOptions.name; // 公开暴露名字
  output.sourcemap = true; // 生成sourcemap
  console.log(output);

  return {
    input: resolve(targetPath, "src/index.ts"),
    output,
    plugins: [
      json(),
      ts({
        tsconfig: resolve(__dirname, "tsconfig.json")
      }),
      nodeResolve()
    ]
  };
}

export default buildOptions.formats.map(format => createBuildConfig(outputConfig[format]));
