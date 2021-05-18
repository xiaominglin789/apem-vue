import { isObject } from "@vue/shared/src";
import {
  handleReactive,
  handleShollawReactive,
  handleReadonly,
  handleShollawReadonly,
} from "./base-handler";

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
function createReactiveObject(target: any, isReadonly: boolean, handle: ProxyHandler<object>) {
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

  // 无缓存, 新建, 先存缓存
  const targetProxy = new Proxy<object>(target, handle);
  proxyMap.set(target, targetProxy);

  return targetProxy;
}


/** reactive包装: 所有深度的属性都被包装成proxy */
function reactive(data: any) {
  return createReactiveObject(data, false, handleReactive);
}

/** shallowReactive包装: 只有第一层属性会被包装成proxy,其他层不会 */
function shallowReactive(data: any) {
  return createReactiveObject(data, false, handleShollawReactive);
}

/** readonly包装: 所有属性都是只读,不能改 */
function readonly(data: any) {
  return createReactiveObject(data, true, handleReadonly);
}

/**
 * shallowReadonly包装: 只有第一层属性是只读的,其他层的可读可改
 */
function shallowReadonly(data: any) {
  return createReactiveObject(data, true, handleShollawReadonly);
}

export {
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly
};
