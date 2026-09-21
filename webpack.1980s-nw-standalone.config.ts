import fs from 'node:fs';
import HtmlInlineScriptWebpackPlugin from 'html-inline-script-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'node:path';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { VueLoaderPlugin } from 'vue-loader';
import webpack from 'webpack';

const HTMLInlineCSSWebpackPlugin = require('html-inline-css-webpack-plugin').default;

const projectRoot = __dirname;
const entryScript = path.join(projectRoot, 'src/index.ts');
const entryHtml = path.join(projectRoot, 'src/index.html');
const outputDirectory = path.join(projectRoot, 'dist');

/**
 * `?url` 导入的资源（图片 / 音频 / 字体）的输出路径。
 *
 * 资源不再 base64 内联进 HTML，而是落到 `dist/assets/<源目录>/`；
 * 目录名沿用 `src/assets/` 下的原名（banner / home / ornaments，以及将来新增的立绘 / 按钮 / 装饰 / 背景……），
 * 这样打开产物目录一眼能看出某个文件属于哪类素材。
 * 文件名带 8 位内容哈希：换素材后 URL 跟着变，浏览器不会拿旧缓存。
 */
const assetFilename = (pathData: { filename?: string }): string => {
  const rel = (pathData.filename ?? '').replace(/\\/g, '/');
  const marker = 'src/assets/';
  const at = rel.indexOf(marker);
  // pathData.filename 带着 `?url` 这类查询后缀，必须剥掉，否则产出的文件名会拖一条 `?url` 尾巴
  const inner = (at >= 0 ? rel.slice(at + marker.length) : path.posix.basename(rel)).split('?')[0].split('#')[0];
  const dir = path.posix.dirname(inner);
  const ext = path.posix.extname(inner);
  const name = path.posix.basename(inner, ext);
  const file = `${name}.[contenthash:8]${ext}`;
  return dir === '.' ? `assets/${file}` : `assets/${dir}/${file}`;
};

/**
 * `src/static/` 是「原样搬走、不参与打包」的目录，目前装着三个文件：
 *   favicon.ico            浏览器标签页图标
 *   apple-touch-icon.png   手机「添加到主屏幕」图标
 *   404.html               找不到地址时显示的页面
 *
 * 为什么必须待在产物**根目录**、不能走打包：
 *   - 浏览器会主动去要 `/favicon.ico`，这个路径是写死的；
 *   - Cloudflare Pages 只在站点根目录找 404 页，而且「根目录有 404 页」这件事本身就是
 *     关掉它「任何找不到的网址都回首页」默认行为的开关。
 * 走 webpack 的资源处理会把它们带上内容哈希塞进 `assets/`，位置就全错了。
 *
 * 为什么不用第三方拷贝插件：就为两三个文件装一个依赖不划算，这十几行够用且看得懂。
 */
const staticDirectory = path.join(projectRoot, 'src/static');

class CopyStaticToRootPlugin {
  apply(compiler: webpack.Compiler): void {
    compiler.hooks.thisCompilation.tap('CopyStaticToRootPlugin', compilation => {
      compilation.hooks.processAssets.tap(
        { name: 'CopyStaticToRootPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          if (!fs.existsSync(staticDirectory)) return;
          for (const name of fs.readdirSync(staticDirectory)) {
            const full = path.join(staticDirectory, name);
            if (!fs.statSync(full).isFile()) continue;
            compilation.emitAsset(name, new webpack.sources.RawSource(fs.readFileSync(full)));
          }
        },
      );
    });
  }
}

export default (_env: unknown, argv: { mode?: 'development' | 'production' }): webpack.Configuration => ({
  experiments: {
    outputModule: true,
  },
  devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
  watchOptions: {
    ignored: ['**/dist', '**/node_modules'],
  },
  entry: {
    index: entryScript,
  },
  target: 'browserslist',
  output: {
    devtoolNamespace: '1980s-nw-standalone',
    filename: 'index.js',
    path: outputDirectory,
    chunkFilename: '[name].[contenthash].chunk.js',
    asyncChunks: true,
    clean: true,
    publicPath: '',
    library: {
      type: 'module',
    },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: 'vue-loader',
        exclude: /node_modules/,
      },
      {
        oneOf: [
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              onlyCompileBundledFiles: true,
              appendTsSuffixTo: [/\.vue$/],
              compilerOptions: {
                noUnusedLocals: false,
                noUnusedParameters: false,
              },
            },
            resourceQuery: /raw/,
            type: 'asset/source',
            exclude: /node_modules/,
          },
          {
            test: /\.(sa|sc)ss$/,
            use: ['postcss-loader', 'sass-loader'],
            resourceQuery: /raw/,
            type: 'asset/source',
            exclude: /node_modules/,
          },
          {
            test: /\.css$/,
            use: ['postcss-loader'],
            resourceQuery: /raw/,
            type: 'asset/source',
            exclude: /node_modules/,
          },
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
              appendTsSuffixTo: [/\.vue$/],
              compilerOptions: {
                noUnusedLocals: false,
                noUnusedParameters: false,
              },
            },
            resourceQuery: /url/,
            type: 'asset/resource',
            generator: { filename: assetFilename },
            exclude: /node_modules/,
          },
          {
            test: /\.(sa|sc)ss$/,
            use: ['postcss-loader', 'sass-loader'],
            resourceQuery: /url/,
            type: 'asset/resource',
            generator: { filename: assetFilename },
            exclude: /node_modules/,
          },
          {
            test: /\.css$/,
            use: ['postcss-loader'],
            resourceQuery: /url/,
            type: 'asset/resource',
            generator: { filename: assetFilename },
            exclude: /node_modules/,
          },
          {
            resourceQuery: /url/,
            type: 'asset/resource',
            generator: { filename: assetFilename },
            exclude: /node_modules/,
          },
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              onlyCompileBundledFiles: true,
              appendTsSuffixTo: [/\.vue$/],
              compilerOptions: {
                noUnusedLocals: false,
                noUnusedParameters: false,
              },
            },
            exclude: /node_modules/,
          },
          {
            test: /\.html$/,
            use: {
              loader: 'html-loader',
              options: {
                // 关掉「把 HTML 属性当模块解析」这个行为。
                // 原因：模板 src/index.html 里的两个图标声明指向的是产物根目录下的固定文件
                // （见下面 CopyStaticToRootPlugin），它们不是能被打包的模块；
                // html-loader 默认会去解析 <link href>，然后直接报「找不到模块」把构建打断。
                // 模板本身是纯外壳（只有 meta / title / style / 一个空的 #app），不含任何素材，
                // 所以关掉不影响任何现有功能。以后若要在模板里直接放图片，需要改回默认值。
                sources: false,
              },
            },
            exclude: /node_modules/,
          },
          {
            test: /\.s(a|c)ss$/,
            use: [
              MiniCssExtractPlugin.loader,
              { loader: 'css-loader', options: { url: false } },
              'postcss-loader',
              'sass-loader',
            ],
            exclude: /node_modules/,
          },
          {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, { loader: 'css-loader', options: { url: false } }, 'postcss-loader'],
            exclude: /node_modules/,
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx', '.vue', '.css'],
    plugins: [
      new TsconfigPathsPlugin({
        extensions: ['.ts', '.js', '.tsx', '.jsx', '.vue'],
        configFile: path.join(projectRoot, 'tsconfig.json'),
      }),
    ],
    alias: {},
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: entryHtml,
      filename: 'index.html',
      scriptLoading: 'module',
      cache: false,
    }),
    new CopyStaticToRootPlugin(),
    new HtmlInlineScriptWebpackPlugin(),
    new MiniCssExtractPlugin(),
    new HTMLInlineCSSWebpackPlugin({
      styleTagFactory({ style }: { style: string }) {
        return `<style>${style}</style>`;
      },
    }),
    new VueLoaderPlugin(),
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    }),
  ],
  optimization: {
    minimize: argv.mode === 'production',
    minimizer: [
      argv.mode === 'production'
        ? new TerserPlugin({
            terserOptions: {
              format: { quote_style: 1 },
              mangle: { reserved: ['_', 'toastr', 'YAML', '$', 'z'] },
            },
          })
        : new TerserPlugin({
            extractComments: false,
            terserOptions: {
              format: { beautify: true, indent_level: 2 },
              compress: false,
              mangle: false,
            },
          }),
    ],
  },
  // 不设 externals：所有依赖一律打进产物，产物必须能完全独立运行
  // （断网可启动、不向任何外部 CDN 取东西）。
  //
  // 历史包袱已清掉：
  // - vue 曾走 globalThis.Vue、pinia / klona 走 jsdelivr 的 `+esm`、
  //   lodash 走页面预插的 CDN 脚本提供的 globalThis._，
  //   结果 CDN 一断就白屏且没有任何提示。现在全部内联；
  //   lodash 这类历史上的全局库改由 src/standalone-globals.ts 显式 import 后挂到 globalThis._。
  // - jquery / showdown / toastr / vue-router / yaml 的 globalThis 映射是死代码，
  //   全项目没有一处 import 它们（裸 `toastr.` 调用不经过 webpack），一并删除。
  //
  // 副作用是好的：将来若引入解析不到的裸包，构建会直接报错，
  // 而不是悄悄把产物指向一个外网地址。
});
