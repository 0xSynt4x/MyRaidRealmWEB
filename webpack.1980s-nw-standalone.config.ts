import HtmlInlineScriptWebpackPlugin from 'html-inline-script-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import fs from 'node:fs';
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

class CdnPreloadPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap('CdnPreloadPlugin', compilation => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync('CdnPreloadPlugin', (data, cb) => {
        const script = `
(function(){
  var scripts = [
    'https://testingcf.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js',
    'https://testingcf.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
  ];
  var idx = 0;
  function loadNext() {
    if (idx >= scripts.length) { return; }
    var src = scripts[idx++];
    var s = document.createElement('script');
    s.src = src;
    s.onload = loadNext;
    s.onerror = loadNext;
    document.head.appendChild(s);
  }
  loadNext();
})();
`;
        const preloadScript = {
          tagName: 'script',
          voidTag: false,
          meta: { preload: true },
          attributes: { type: 'text/javascript' },
          innerHTML: script,
        };
        data.assetTags.scripts.unshift(preloadScript);
        cb(null, data);
      });
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
            type: 'asset/inline',
            exclude: /node_modules/,
          },
          {
            test: /\.(sa|sc)ss$/,
            use: ['postcss-loader', 'sass-loader'],
            resourceQuery: /url/,
            type: 'asset/inline',
            exclude: /node_modules/,
          },
          {
            test: /\.css$/,
            use: ['postcss-loader'],
            resourceQuery: /url/,
            type: 'asset/inline',
            exclude: /node_modules/,
          },
          {
            resourceQuery: /url/,
            type: 'asset/inline',
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
            use: 'html-loader',
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
    new CdnPreloadPlugin(),
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
  externals: ({ context, request }, callback) => {
    if (!context || !request) {
      return callback();
    }

    if (
      request.startsWith('-') ||
      request.startsWith('.') ||
      request.startsWith('/') ||
      request.startsWith('!') ||
      request.startsWith('http') ||
      request.startsWith('@/') ||
      request.startsWith('@util/') ||
      path.isAbsolute(request) ||
      fs.existsSync(path.join(context, request)) ||
      fs.existsSync(request)
    ) {
      return callback();
    }

    if (
      ['vue', 'vue-router'].every(key => request !== key) &&
      ['pixi', 'react', 'vue'].some(key => request.includes(key))
    ) {
      return callback();
    }

    if (request === 'zod') {
      return callback();
    }

    const global: Record<string, string> = {
      jquery: 'globalThis.$',
      lodash: 'globalThis._',
      showdown: 'globalThis.showdown',
      toastr: 'globalThis.toastr',
      vue: 'globalThis.Vue',
      'vue-router': 'globalThis.VueRouter',
      yaml: 'globalThis.YAML',
    };

    if (request in global) {
      return callback(null, 'var ' + global[request]);
    }

    return callback(null, 'module-import ' + `https://testingcf.jsdelivr.net/npm/${request}/+esm`);
  },
});
