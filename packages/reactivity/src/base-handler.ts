import { isObject } from "@vue/shared";
import { readonly, reactive } from "./reactive";
import { TrackOpsEnum } from "./enum";
import { track } from "./effect";

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
function createGetter(isReadonly=false, isShollaw=false) {
  return function get(target: object, key: string, recevier: object) {
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
  }
}

/**
 * setter写入(只有响应式数据才能修改)
 * @param isShollaw 是否为仅作用于第一层, true: 仅作用于第一层， false: 全部嵌套属性都响应式
 */
function createSetter(isShollaw=false) {
  return function set(target: object, key: string, newValue: any, recevier: object) {
    const result = Reflect.set(target, key, newValue, recevier);
    
    if (isShollaw) {
      // true
    } else {
      // false
    }


    return result;
  }
}

/** reactive包装-get/set处理 */
const handleReactive = {
  get,
  set,
}

/** shallowReactive包装-get/set处理 */
const handleShollawReactive = {
  get: shollawReactiveGetter,
  set: shollawReactiveSetter
}

/** readonly包装-get/set处理 */
const handleReadonly = {
  get: readonlyGetter,
  set: (target: object, key: string) => {
    console.warn(target, " 所有属性都是只读, 无法修改");
    return false;
  }
}

/** shallowReadonly包装-get/set处理 */
const handleShollawReadonly = {
  get: shollawReadonlyGetter,
  set: (target: object, key: string) => {
    console.warn(target, " 的属性:", key, " 属性是只读的, 无法修改");
    return false;
  }
}

export {
  handleReactive,
  handleShollawReactive,
  handleReadonly,
  handleShollawReadonly,
}
