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
 * 判断 是不是函数类型
 * @param target
 * @returns true: 函数类型,  false: 非函数类型
 */
function isFunction(target) {
    return typeof target == "function";
}
/**
 * 判断 是不是数字类型
 * @param target
 * @returns true: 数字类型,  false: 非数字类型
 */
function isNumber(target) {
    return typeof target == "number";
}
/**
 * 判断 是不是字符串类型
 * @param target
 * @returns true: 字符串类型,  false: 非字符串类型
 */
function isString(target) {
    return typeof target == "string";
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

export { compareValue, hasOwnKey, isArray, isFunction, isInteger, isNumber, isObject, isString };
//# sourceMappingURL=shared.esm-bundler.js.map
