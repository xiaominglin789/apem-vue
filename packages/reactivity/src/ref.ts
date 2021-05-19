import { compareValue, isArray, isObject } from "@vue/shared/src";
import { track, trigger } from "./effect";
import { TrackOpsEnum, TriggerOpsEnum } from "./enum";
import { reactive } from "./reactive";

/**
 * ref用于基本类型的代理 [number string boolean null undefined]
 * - 可以包装object类型，但是 对象类型包装最终使用的是 reactive 包装。
 * - 类-RefImpl内部实现 会被转成es5的 Object.definedProperty() 代理实现
 * @param value 
 */
function ref(value: any) {
  return createRef(value);
}

/** 浅层ref包装 */
function shallowRef(value: any) {
  return createRef(value, true)
}


/**
 * 创建普通包装
 * @param rawValue 原始值
 * @param shallow 是否浅层包装
 * @returns 
 */
function createRef(rawValue: any, shallow=false) {
  return new RefImpl(rawValue, shallow);
}

/** 转换器 如果ref 传入的是对象，则 会变成 转出reactive-proxy对象 */
const convert = (val) => isObject(val) ? reactive(val) : val;

/** 
 * ref类代理
 * es6-class类 => babel.js(转es5语法) => 内部使用 Object.defineProperty 代理
 */
class RefImpl {
  public _value;
  public _rawValue;
  public _shallow
  public __v_isRef = true;

  /**
   * @param rawValue 原始
   * @param shallow 是否是浅层包装
   */
  constructor(rawValue: any, shallow=false) {
    this._rawValue = rawValue;
    this._shallow = shallow;
    this._value = shallow ? rawValue : convert(rawValue);
  }

  public get value() {
    // 收集依赖
    track(this, TrackOpsEnum.GET, 'value');
    return this._value;
  }

  public set value(newValue) {
    if (!compareValue(this._value, newValue)) {
      this._rawValue = newValue;
      this._value = this._shallow ? newValue : convert(newValue);
      // 触发依赖更新
      trigger(this, TriggerOpsEnum.SET, 'value', newValue, this._rawValue);
    }
  }
}

/** 将普通对象key对应的value 转出代理对象 */
class ObjectRefImpl {
  public __v_isRef = true;

  constructor(public _object, public _key) {}

  public get value() {
    return this._object[this._key];
  }

  public set value(val) {
    this._object[this._key] = val;
  }
}

/**
 * 将对象的一个属性的值变成 对象
 * - 保证代理对象属性解构出来使用,依然会收集和触发的依赖。
 * @param target 
 * @param key 
 * @returns 
 */
function toRef<T extends object, K extends keyof T>(target: T, key: K) {
  return new ObjectRefImpl(target, key);
}

/**
 * 将对象的所有属性的值变成 对象
 * - 保证代理对象属性解构出来使用,依然能收集和触发的依赖。
 * @param target 
 * @returns 
 */
function toRefs<T extends object>(target: T) {
  const ret = isArray(target) ? new Array[target["length"]] : {};
  for (const key in target) {
    ret[key] = toRef(target, key);
  }
  return ret;
}

export {
  ref,
  shallowRef,
  toRef,
  toRefs
}
