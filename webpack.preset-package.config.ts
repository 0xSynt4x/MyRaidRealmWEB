import path from 'node:path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';

const projectRoot = __dirname;

/**
 * 预设独立包 → `dist/preset-package/index.js`
 *
 * 预设**故意不内联进 `dist/index.html`**：它是可以单独更新的数据，
 * 放成独立文件后，线上换预设不用把整个页面重新发一遍。
 *
 * 这份产物会随 `wrangler pages deploy dist` 一起上 Cloudflare Pages，
 * 页面里的加载器优先用「同级相对」候选 `../preset-package/index.js` 命中自家域名
 * （见 `src/utils/preset-loader.ts` 的候选列表）。
 *
 * 注意：必须**在主构建之后**跑 —— 主构建的 `output.clean` 会把整个 `dist/` 清空。
 */
export default (_env: unknown, argv: { mode?: 'development' | 'production' }): webpack.Configuration => ({
  name: 'preset-package',
  mode: argv.mode === 'production' ? 'production' : 'development',
  devtool: false,
  entry: path.join(projectRoot, 'preset-package/index.ts'),
  target: 'browserslist',
  output: {
    path: path.join(projectRoot, 'dist/preset-package'),
    filename: 'index.js',
    // 加载器是用 <script src>（普通脚本，不是 type=module）插进去的，所以产物必须是 IIFE。
    // 入口只做副作用（往 window.__TH1980S_PRESETS__ 赋值），不需要导出任何东西。
    clean: true,
  },
  module: {
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
        exclude: /node_modules/,
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          onlyCompileBundledFiles: true,
          compilerOptions: {
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  optimization: {
    minimize: argv.mode === 'production',
  },
});
