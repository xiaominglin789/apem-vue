import { isArray } from "@vue/shared/src";
import { TrackOpsEnum, TriggerOpsEnum } from "./enum";

/** effect序号标识 */
let effectID = 0;
/** 当前的effect */
let activeEffect;
/** effect存储栈 */
const effectStack: Array<Function> = [];
/** 对象-属性-effects 依赖映射表 */
const targetEffectMap: WeakMap<object, Map<string, Set<Function>>> = new WeakMap();

/**
 * 副作用
 * 作用: 可响应的effect, 数据变化时重新执行
 * @param fn 函数
 * @param options 配置对象:key-value
 */
export function effect(fn: Function, options: any) {
  // 数据变化，重新执行
  const eff = createReactiveEffect(fn, options);

  if (!options?.lazy) {
    // 默认先执行一次
    eff();
  }

  return eff;
}

/** 创建可响应的efflect函数 - 闭包 */
function createReactiveEffect(fn: Function, options: any)  {

  const effect = function reactiveEffect() {
    // 函数执行, 会取值, 会执行 reactive的get 关联-依赖收集
    if (!effectStack.includes(effect)) {
      try {
        effectStack.push(effect);
        activeEffect = effect;
        return fn();
      } finally {
        // 遇到嵌套effect函数时，保证 activeEffect 正确指向
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  }

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

/** 清除依赖收集 */
function cleanup() {}

/**
 * 收集器 依赖收集函数
 * 让 某个对象的属性,收集其当前对应的effect函数。
 * @param target 目标对象
 * @param trackOpType 操作标识
 * @param key 对象的属性
 */
export function track(target: object, trackOpType: TrackOpsEnum, key: string) {
  if (activeEffect === undefined) {
    return;
  }

  let depsMap = targetEffectMap.get(target);
  if (!depsMap) {
    targetEffectMap.set(target, (depsMap = new Map))
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
export function trigger(target: object, triggerOpsEnum: TriggerOpsEnum, key?: string, newValue?: any, oldValue?: any) {
  // 取出-当前目标对应的effects
  const depsMap = targetEffectMap.get(target);
  if (!depsMap) {
    // 该对象无依赖, 后续不操作
    return;
  }

  /** 收集将要操作的effect-事件, 最后才去执行。 */
  const waitRunEffects = new Set<Function>();
  /** 收集将要操作的effect-事件, 最后才去执行。 */
  const addToWaitRunEffects = (effs: Set<Function>) => {
    if (effs) {
      effs.forEach((eff: Function) => waitRunEffects.add(eff));
    }
  }

  if (key === "length"  && isArray(target)) {
    // 查看是否修改的是数组的长度, 特殊处理:
    depsMap.forEach((dep, key) => {
      // 如果是直接修改的length属性 或者 旧的长度 > 新的长度时,将`length`依赖存入起来
      // key 来至于 Map内， Symbol(Symbol.toPrimitive) 类型，String包装再和value隐式比较
      if (String(key) === "length" || String(key) > newValue) {
        addToWaitRunEffects(dep);
      }
    });
  } else {
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
  waitRunEffects.forEach((eff:Function) => {
    eff();
  });
}
