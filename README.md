# 分模块
- reactivity 响应式模块
- shared     

## 主要依赖
```bash
yarn add -D typescript rollup rollup-plugin-typescript2 @rollup/plugin-node-resolve @rollup/plugin-json execa
```
- typescript                    ts支持                  
- rollup                        打包工具-主要针对js代码打包
- rollup-plugin-typescript2     rollup-ts代码编译
- @rollup/plugin-node-resolve   解析node第三方模块
- @rollup/plugin-json           支持引入json
- execa                         子进程工具




## 打包指令
-scripts
	-dev.js
	-build.js
```javascript

```



## 子项目-package私有配置
- module  外部import时的入口
```typescript
// 外部引用时回先去找:package->module 对应的文件,找不到才去找:package->main
import x from "@xxx/xxxxx";


// 包package.json
{
	"main:: "index.js",
  "module": "dist/xxx-xxxx.js"
}

// 打包时 自定义构建的配置项-作用
{
	...
	"buildOptions": {
		"name": "VUeReactivity",   // global暴露给外部使用的默认名
		"formats": [
			"cjs",									// 可以打包成 es5
			"esm-builder",					// 可以打包成 es6
			"global"								// 提供给外部应用使用的包
		]
	}
}
```



