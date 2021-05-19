'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/** 共享模块-通用方法集合 */
/**
 * 判断 是否为对象类型
 * @param target
 * @returns true: 是对象类型,  false: 非对象类型
 */
function isObject(target) {
    return typeof target == "object" && target !== null;
}
/**
 * 判断 是不是数组类型
 * @param target
 * @returns true: 数组类型,  false: 非数组类型
 */
function isArray(target) {
    return Array.isArray(target);
}
/**
 * 判断 是不是整形数字类型
 * @param target
 * @returns true: 整形数字类型,  false: 非 整形数字类型
 */
function isInteger(target) {
    return parseInt(target) + "" === target;
}
/**
 * target 是否有 key 这个属性
 * @param target
 * @param key key键的属性
 * @returns
 */
function hasOwnKey(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}
/**
 * 2值比较是否相等
 * @param valA
 * @param valB
 * @returns true: 值一样的， false: 值不一样
 */
function compareValue(valA, valB) {
    if (!valA || !valB) {
        return false;
    }
    return valB === valA;
}

/** 依赖收集的操作标识枚举 */
var TrackOpsEnum;
(function (TrackOpsEnum) {
    /** 取值 */
    TrackOpsEnum[TrackOpsEnum["GET"] = 0] = "GET";
})(TrackOpsEnum || (TrackOpsEnum = {}));
/** 触发标记枚举 */
var TriggerOpsEnum;
(function (TriggerOpsEnum) {
    /** 添加 */
    TriggerOpsEnum[TriggerOpsEnum["ADD"] = 0] = "ADD";
    /** 修改 */
    TriggerOpsEnum[TriggerOpsEnum["SET"] = 1] = "SET";
})(TriggerOpsEnum || (TriggerOpsEnum = {}));

/** effect序号标识 */
let effectID = 0;
/** 当前的effect */
let activeEffect;
/** effect存储栈 */
const effectStack = [];
/** 对象-属性-effects 依赖映射表 */
const targetEffectMap = new WeakMap();
/**
 * 副作用
 * 作用: 可响应的effect, 数据变化时重新执行
 * @param fn 函数
 * @param options 配置对象:key-value
 */
function effect(fn, options) {
    // 数据变化，重新执行
    const eff = createReactiveEffect(fn, options);
    if (!options?.lazy) {
        // 默认先执行一次
        eff();
    }
    return eff;
}
/** 创建可响应的efflect函数 - 闭包 */
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        // 函数执行, 会取值, 会执行 reactive的get 关联-依赖收集
        if (!effectStack.includes(effect)) {
            try {
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
 * 收集器 依赖收集函数
 * 让 某个对象的属性,收集其当前对应的effect函数。
 * @param target 目标对象
 * @param trackOpType 操作标识
 * @param key 对象的属性
 */
function track(target, trackOpType, key) {
    if (activeEffect === undefined) {
        return;
    }
    let depsMap = targetEffectMap.get(target);
    if (!depsMap) {
        targetEffectMap.set(target, (depsMap = new Map));
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
}
/**
 * 触发器 effect->通知->视图更新
 * @param target 目标对象
 * @param TriggerOpsEnum 触发的类型:SET / ADD
 * @param key 哪个键
 * @param newValue 新值
 * @param oldValue 旧值
 */
function trigger(target, triggerOpsEnum, key, newValue, oldValue) {
    // 取出-当前目标对应的effects
    const depsMap = targetEffectMap.get(target);
    if (!depsMap) {
        // 该对象无依赖, 后续不操作
        return;
    }
    /** 收集将要操作的effect-事件, 最后才去执行。 */
    const waitRunEffects = new Set();
    /** 收集将要操作的effect-事件, 最后才去执行。 */
    const addToWaitRunEffects = (effs) => {
        if (effs) {
            effs.forEach((eff) => waitRunEffects.add(eff));
        }
    };
    if (key === "length" && isArray(target)) {
        // 查看是否修改的是数组的长度, 特殊处理:
        depsMap.forEach((dep, key) => {
            // 如果是直接修改的length属性 或者 旧的长度 > 新的长度时,将`length`依赖存入起来
            // key 来至于 Map内， Symbol(Symbol.toPrimitive) 类型，String包装再和value隐式比较
            if (String(key) === "length" || String(key) > newValue) {
                addToWaitRunEffects(dep);
            }
        });
    }
    else {
        // 普通key对象
        if (key !== undefined) {
            addToWaitRunEffects(depsMap.get(key));
        }
        // 数组 特殊处理: 是数组 且 添加 的操作，长度改变
        switch (triggerOpsEnum) {
            case TriggerOpsEnum.ADD:
                if (isArray(target)) {
                    addToWaitRunEffects(depsMap.get("length"));
                }
                break;
        }
    }
    // 执行依赖收集的函数
    waitRunEffects.forEach((eff) => {
        eff();
    });
}

/**
 * getter读取
 * @param isReadonly 是否为仅读, true: readonly仅读, false: 响应式proxy
 * @param isShollaw 是否为仅作用于第一层, true: 仅作用于第一层， false: 全部嵌套属性都仅读或响应式
 * @returns
 */
function createGetter(isReadonly = false, isShollaw = false) {
    return function get(target, key, receiver) {
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
    };
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
function createSetter(isShollaw = false) {
    return function set(target, key, newValue, receiver) {
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
        }
        else if (!compareValue(oldValue, newValue)) {
            // 值不同,才去改 - 通知effect trigger操作
            trigger(target, TriggerOpsEnum.SET, key, newValue);
        }
        // 返回修改的结果 true/false
        return result;
    };
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
        console.warn(target, " 所有属性都是只读," + key + " 无法修改");
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
    // 无缓存, 新建, 先存缓存
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

/**
 * ref用于基本类型的代理 [number string boolean null undefined]
 * - 可以包装object类型，但是 对象类型包装最终使用的是 reactive 包装。
 * - 类-RefImpl内部实现 会被转成es5的 Object.definedProperty() 代理实现
 * @param value
 */
function ref(value) {
    return createRef(value);
}
/** 浅层ref包装 */
function shallowRef(value) {
    return createRef(value, true);
}
/**
 * 创建普通包装
 * @param rawValue 原始值
 * @param shallow 是否浅层包装
 * @returns
 */
function createRef(rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow);
}
/** 转换器 如果ref 传入的是对象，则 会变成 转出reactive-proxy对象 */
const convert = (val) => isObject(val) ? reactive(val) : val;
/**
 * ref类代理
 * es6-class类 => babel.js(转es5语法) => 内部使用 Object.defineProperty 代理
 */
class RefImpl {
    /**
     * @param rawValue 原始
     * @param shallow 是否是浅层包装
     */
    constructor(rawValue, shallow = false) {
        this.__v_isRef = true;
        this._rawValue = rawValue;
        this._shallow = shallow;
        this._value = shallow ? rawValue : convert(rawValue);
    }
    get value() {
        // 收集依赖
        track(this, TrackOpsEnum.GET, 'value');
        return this._value;
    }
    set value(newValue) {
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
    constructor(_object, _key) {
        this._object = _object;
        this._key = _key;
        this.__v_isRef = true;
    }
    get value() {
        return this._object[this._key];
    }
    set value(val) {
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
function toRef(target, key) {
    return new ObjectRefImpl(target, key);
}
/**
 * 将对象的所有属性的值变成 对象
 * - 保证代理对象属性解构出来使用,依然能收集和触发的依赖。
 * @param target
 * @returns
 */
function toRefs(target) {
    const ret = isArray(target) ? new Array[target["length"]] : {};
    for (const key in target) {
        ret[key] = toRef(target, key);
    }
    return ret;
}

exports.effect = effect;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
exports.shallowRef = shallowRef;
exports.toRef = toRef;
exports.toRefs = toRefs;
//# sourceMappingURL=reactivity.cjs.js.map
