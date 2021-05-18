import { compareValue, hasOwnKey, isArray, isInteger, isObject } from "@vue/shared";
import { readonly, reactive } from "./reactive";
import { TrackOpsEnum, TriggerOpsEnum } from "./enum";
import { track, trigger } from "./effect";
/**
 * getter读取
 * @param isReadonly 是否为仅读, true: readonly仅读, false: 响应式proxy
 * @param isShollaw 是否为仅作用于第一层, true: 仅作用于第一层， false: 全部嵌套属性都仅读或响应式
 * @returns 
 */
function createGetter(isReadonly=false, isShollaw=false) {
  return function get(target: object, key: string, receiver?: any) {
    // 从反射中取值
    const result = Reflect.get(target, key, receiver);

    if (!isReadonly) {
      // 只读的对象不做依赖收集
      // 响应式对象-才作依赖收集
      // 取值时, 去 执行 tract 收集 effect
      // v3 effect =取代了=>  v2 watcher
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
 * 注意点:
 * 1.target push / pop 等修改了数组长度的操作 都会触发2次set. 
 *    因为第一次是下标索引值的改变,
 *    第二次是length属性的改变, 但是 。
 * 2.如果是外部直接修改数组的length属性, 执行 trigger
 */
function createSetter(isShollaw=false) {
  return function set(target: object, key: string, newValue: any, receiver?: any) {
    const oldValue = target[key];
    // 是不是数组, 判断key(下标)是不是比原数组长度小:  小-> set 修改操作, 大 添加新元素的操作
    //   不是数值型数组, 则为 对象类型。判断 key是不是对象商的属性。是 -> 修改操作， 否 添加新属性的操作。
    let hasKey = (isArray(target) && isInteger(key)) ? 
                  (Number(key) < target['length']) : hasOwnKey(target, key);
    
    // 反射 - 修改新值
    const result = Reflect.set(target, key, newValue, receiver);                  

    // 根据 类型判断的操作 调用 触发器
    if (!hasKey) {
      // 添加操作 - 通知effect trigger操作
      trigger(target, TriggerOpsEnum.ADD, key, newValue);
    } else if (!compareValue(oldValue, newValue)) {
      // 值不同,才去改 - 通知effect trigger操作
      trigger(target, TriggerOpsEnum.SET, key, newValue, oldValue);
    }
    
    // 返回修改的结果 true/false
    return result;
  }
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
    console.warn(target, " 所有属性都是只读," + key + " 无法修改");
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
