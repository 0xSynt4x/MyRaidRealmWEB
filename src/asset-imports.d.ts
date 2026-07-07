/**
 * 资源导入的类型声明。
 *
 * 本项目通过 webpack 的资源查询后缀导入文本与二进制资源：
 * - `?raw`：以字符串形式内联文件内容（asset/source）。
 * - `?url`：以最终打包 URL 形式导入资源（asset/resource）。
 *
 * TypeScript 本身不认识这些查询后缀，需在此显式声明，
 * 否则 vue-tsc/tsc 的类型检查会报 TS2307 找不到模块。
 */

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*?url' {
  const url: string;
  export default url;
}

/**
 * webpack 的 CommonJS `require`（用于运行时惰性/同步模块加载）。
 * 这里最小声明，避免为整个项目引入 Node 全局类型污染浏览器环境。
 */
declare function require<T = any>(id: string): T;

