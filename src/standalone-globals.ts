/**
 * standalone 模式的全局垫片。
 *
 * 项目里有 150+ 处直接写裸 `_`（lodash 的全局用法，不写 import）——
 * 在酒馆宿主里由宿主提供，在 standalone 里原先靠页面预插的一条 CDN 脚本提供。
 * 为了让产物不依赖 CDN（断网也能启动），这里把 lodash 显式挂到 globalThis 上。
 *
 * 为什么不用 webpack 的 ProvidePlugin 自动注入：实测它注入的 `_` 拿不到 `_.clamp`
 * 这类方法（注入的是模块命名空间而非 lodash 本体），排查成本高、行为不可控。
 * 显式挂全局一行搞定，且意图清楚。
 *
 * 🔴 必须在入口 `src/index.ts` 的**第一行** import：
 *    有模块可能在初始化阶段就用到 `_`，晚一步就炸。
 */
import lodash from 'lodash';

(globalThis as unknown as { _: typeof lodash })._ = lodash;
