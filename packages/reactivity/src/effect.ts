import { isArray } from "@vue/shared/src";
import { TrackOpsEnum, TriggerOpsEnum } from "./enum";

/** 配置项参数定义 */
interface IEffectOptions {
  /** 是否为懒加载 */
  lazy: boolean
}

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
function effect(fn: Function, options: IEffectOptions = { lazy: false }) {
  const effect = createReactiveEffect(fn, options);

  if (!options.lazy) {
    // 默认先执行一次
    effect();
  }

  return effect;
}

/** 创建可响应的efflect函数 - 闭包 */
function createReactiveEffect(fn: Function, options: IEffectOptions = { lazy: false }) {
  const effect = function reactiveEffect() {
    // 函数执行, 会取值, 会执行reactive的get方法作依赖收集
    if (!effectStack.includes(effect)) {
      try {
        // console.log("准备执行effect内的函数");
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

/**
 * 收集器 依赖收集函数
 * 让 某个对象的属性,收集其当前对应的effect函数。
 * @param target 目标对象
 * @param trackOpType 操作标识
 * @param key 对象的属性
 */
function track(target: any, trackOpType: TrackOpsEnum, key: string) {
  // console.log("收集到依赖 ", target, " ", key);
  // console.log(target, key, activeEffect);
  if (null === activeEffect) {
    return;
  }

  let depsMap = targetEffectMap.get(target);
  if (!depsMap) {
    // 空map,初始化taget键
    targetEffectMap.set(target, (depsMap = new Map))
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
}

/**
 * 触发器 effect->通知->视图更新
 * @param target 目标对象
 * @param TriggerOpsEnum 触发的类型:SET / ADD
 * @param key 哪个键
 * @param newValue 新值
 * @param oldValue 旧值
 */
function trigger(target: any, triggerOpsEnum: TriggerOpsEnum, key?: string, newValue?: any, oldValue?: any) {
  console.error(target, triggerOpsEnum, key, newValue, oldValue);

  // 取出-当前目标对应的effects
  const depsMap = targetEffectMap.get(target);
  if (!depsMap) {
    // 该对象无依赖, 后续不操作
    return;
  }

  // 缓存要操作的effects, 最终一起执行。
  const effects = new Set();
  const add = (effs) => {
    if (effs) {
      effs.forEach(eff => effects.add(eff));
    }
  }

  // 当前依赖
  console.log(depsMap);
  
  // 查看是否修改的是数组的长度, 特殊处理:
  if (key === "length"  && isArray(target)) {
    console.log("aaaaaaaaaaa");
    // 数组
    // 如果对应的长度, 有依赖收集 则需要更新
    depsMap.forEach((dep, key) => {
      console.log("key ", key, " newValue ", newValue);
      if (key==="length" || key > newValue) {
        add(dep);
        console.log(dep);
      }
    });
  } else {
    // 非数组
    console.log("bbbbbbbbbb");
  }
  
  console.log("effects ", effects);

  // 执行effects内的每一个函数
  effects.forEach((ef:Function) => {
    console.log(ef);
    ef();
  });
}

export {
  effect,
  track,
  trigger
}
