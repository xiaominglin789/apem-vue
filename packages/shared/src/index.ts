/** 共享模块-通用方法集合 */

/**
 * 判断data是否为对象类型
 * @param data 
 * @returns true: 是对象类型,  false: 非对象类型
 */
function isObject(data: any): boolean {
  let flag = false;
  if (Object.prototype.toString.call(data) === "[object Object]") {
    flag = true;
  }
  
  return flag;
}


export {
  isObject
};
