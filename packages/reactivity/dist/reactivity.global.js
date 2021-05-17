var VueReactivity = (function (exports) {
  'use strict';

  /** 共享模块-通用方法集合 */
  /**
   * 判断data是否为对象类型
   * @param data
   * @returns true: 是对象类型,  false: 非对象类型
   */
  function isObject(data) {
      let flag = false;
      if (Object.prototype.toString.call(data) === "[object Object]") {
          flag = true;
      }
      return flag;
  }

  /** 依赖收集的操作标识枚举 */
  var TrackOpsEnum;
  (function (TrackOpsEnum) {
      /** 取值 */
      TrackOpsEnum[TrackOpsEnum["GET"] = 0] = "GET";
  })(TrackOpsEnum || (TrackOpsEnum = {}));

  /** effect序号标识 */
  let effectID = 0;
  /** 当前的effect */
  let activeEffect = null;
  /** effect存储栈 */
  const effectStack = [];
  /**
   * 对象-属性-effects 依赖映射表
   * 结构:-WeakMap(-Map(-Set))
   * {
   *    target: {
   *      key: Set(effect1, effect2)
   *    }
   * }
   */
  const targetEffectMap = new WeakMap();
  /**
   * 副作用
   * 作用: 可响应的effect, 数据变化时重新执行
   * @param fn 函数
   * @param options 配置对象:key-value
   */
  function effect(fn, options = { lazy: false }) {
      const effect = createReactiveEffect(fn, options);
      if (!options.lazy) {
          // 默认先执行一次
          effect();
      }
      return effect;
  }
  /** 创建可响应的efflect函数 - 闭包 */
  function createReactiveEffect(fn, options = { lazy: false }) {
      const effect = function reactiveEffect() {
          // 函数执行, 会取值, 会执行reactive的get方法作依赖收集
          if (!effectStack.includes(effect)) {
              try {
                  console.log("准备执行effect内的函数");
                  effectStack.push(effect);
                  activeEffect = effect;
                  return fn();
              }
              finally {
                  // 遇到嵌套effect函数时，保证 activeEffect 正确指向
                  effectStack.pop();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      // 当前effect的id标识
      effect.id = effectID++;
      // 标记为 响应式的effect
      effect._isEffect = true;
      // effect-对应的原函数
      effect.raw = fn;
      // effect-属性配置
      effect.options = options;
      return effect;
  }
  /**
   * 依赖收集函数
   * 让 某个对象的属性,收集其当前对应的effect函数。
   * @param target 目标对象
   * @param trackOpType 操作标识
   * @param key 对象的属性
   */
  function track(target, trackOpType, key) {
      // console.log("收集到依赖 ", target, " ", key);
      // console.log(target, key, activeEffect);
      if (null === activeEffect) {
          return;
      }
      let depsMap = targetEffectMap.get(target);
      if (!depsMap) {
          // 空map,初始化taget键
          targetEffectMap.set(target, (depsMap = new Map));
      }
      let dep = depsMap.get(key);
      if (!dep) {
          // 空vulue-map,初始化set
          depsMap.set(key, (dep = new Set));
      }
      // set去重effect
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
      }
      console.log(targetEffectMap);
  }

  /** 响应式对象-get */
  const get = createGetter(false, false);
  /** 仅第一层响应式对象-get */
  const shollawReactiveGetter = createGetter(false, true);
  /** 全部属性仅读对象-get */
  const readonlyGetter = createGetter(true, false);
  /** 仅第一层只读对象-get */
  const shollawReadonlyGetter = createGetter(true, true);
  /** 响应式对象-set */
  const set = createSetter(false);
  /** 仅第一层响应式对象-set */
  const shollawReactiveSetter = createSetter(true);
  /**
   * getter读取
   * @param isReadonly 是否为仅读, true: readonly仅读, false: 响应式proxy
   * @param isShollaw 是否为仅作用于第一层, true: 仅作用于第一层， false: 全部嵌套属性都仅读或响应式
   * @returns
   */
  function createGetter(isReadonly = false, isShollaw = false) {
      return function get(target, key, recevier) {
          const result = Reflect.get(target, key, recevier);
          if (!isReadonly) {
              // 只读的对象不做依赖收集
              // 响应式对象-才作依赖收集
              // 取值时, 去 执行 tract 收集 effect
              // v3 effect =取代了=>  v2 watcher
              console.log("执行effect时会取值， 需要收集effect: ", key);
              track(target, TrackOpsEnum.GET, key);
          }
          if (isShollaw) {
              // 只有第一层是响应式属性
              return result;
          }
          if (isObject(result)) {
              // 当取值时才进行代理
              // 判断对象类型，只读属性，递归包装
              return isReadonly ? readonly(result) : reactive(result);
          }
          return result;
      };
  }
  /**
   * setter写入(只有响应式数据才能修改)
   * @param isShollaw 是否为仅作用于第一层, true: 仅作用于第一层， false: 全部嵌套属性都响应式
   */
  function createSetter(isShollaw = false) {
      return function set(target, key, newValue, recevier) {
          const result = Reflect.set(target, key, newValue, recevier);
          return result;
      };
  }
  /** reactive包装-get/set处理 */
  const handleReactive = {
      get,
      set,
  };
  /** shallowReactive包装-get/set处理 */
  const handleShollawReactive = {
      get: shollawReactiveGetter,
      set: shollawReactiveSetter
  };
  /** readonly包装-get/set处理 */
  const handleReadonly = {
      get: readonlyGetter,
      set: (target, key) => {
          console.warn(target, " 所有属性都是只读, 无法修改");
          return false;
      }
  };
  /** shallowReadonly包装-get/set处理 */
  const handleShollawReadonly = {
      get: shollawReadonlyGetter,
      set: (target, key) => {
          console.warn(target, " 的属性:", key, " 属性是只读的, 无法修改");
          return false;
      }
  };

  /** 响应式数据-代理对象map */
  const reactiveProxyMap = new WeakMap();
  /** 只读数据-代理对象map */
  const readonlyProxyMap = new WeakMap();
  /**
   * 根据配置创建代理对象
   * @param target 数据源
   * @param isReadonly 是否仅读
   * @param handle get/set-处理配置项
   */
  function createReactiveObject(target, isReadonly, handle) {
      /**
       * 1.数据源是不是对象类型, 非对象的数据源直接返回
       * 2.数据源是否已被代理过了,有代理则直接返回代理的数据
       *   - 数据源是不是只读的, 取到对应的数据缓存
       *   - 没有缓存,则存入缓存中、
       */
      if (!isObject(target)) {
          return target;
      }
      const proxyMap = isReadonly ? readonlyProxyMap : reactiveProxyMap;
      if (proxyMap.has(target)) {
          // 有缓存, 返回缓存
          return proxyMap.get(target);
      }
      // 无缓存, 先存缓存
      const targetProxy = new Proxy(target, handle);
      proxyMap.set(target, targetProxy);
      return targetProxy;
  }
  /** reactive包装: 所有深度的属性都被包装成proxy */
  function reactive(data) {
      return createReactiveObject(data, false, handleReactive);
  }
  /** shallowReactive包装: 只有第一层属性会被包装成proxy,其他层不会 */
  function shallowReactive(data) {
      return createReactiveObject(data, false, handleShollawReactive);
  }
  /** readonly包装: 所有属性都是只读,不能改 */
  function readonly(data) {
      return createReactiveObject(data, true, handleReadonly);
  }
  /**
   * shallowReadonly包装: 只有第一层属性是只读的,其他层的可读可改
   */
  function shallowReadonly(data) {
      return createReactiveObject(data, true, handleShollawReadonly);
  }

  exports.effect = effect;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));
//# sourceMappingURL=reactivity.global.js.map
