# 手写vue3 核心模块


## 响应式模块
- reactivity 响应式模块
	+ [reactive, shallowReactive, readonly, shallowReadonly] <-> new Proxy
		- isShallow - 作用于表层(最上层的对象)
			+ true: 表层响应式包装对象
			+ false: 深度递归只读或响应式包装各层对象变proxy
		- isReadonly - 仅读属性
			+ true: set方法不会进行赋值操作， get方法不会收集依赖
	+ effect: 副作用(响应式数据取值时的依赖收集), watchEffect 的基础
		- 1.effect函数中的所有属性 都会收集effect -> track
		- 2.当这些属性触发时,会重新执行effect函数 -> trigger

- shared 公共函数模块



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



