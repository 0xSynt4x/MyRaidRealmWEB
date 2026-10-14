process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
});

const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

globalThis.z = require('zod');
globalThis._ = require('lodash');

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (typeof request === 'string' && request.endsWith('?raw')) {
    request = request.slice(0, -'?raw'.length);
  }

  // 跟 ?raw 同款：webpack 5 的资源 query，在 node 原生 require 里只是路径后缀。
  // 业务代码（首页 BGM、通知音）走 `import url from '...mp3?url'` 拿产物里打包好的
  // 资源 URL；测试环境不需要那个真 URL，只要 require 过得去、default 是字符串。
  if (typeof request === 'string' && request.endsWith('?url')) {
    request = request.slice(0, -'?url'.length);
  }

  if (typeof request === 'string' && path.basename(request) === 'schema' && path.extname(request) === '') {
    try {
      return originalResolveFilename.call(this, `${request}.ts`, parent, isMain, options);
    } catch {
      // 回退到默认解析，保持非测试场景下的原始行为
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions['.txt'] = function loadRawText(module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

require.extensions['.md'] = function loadRawMarkdown(module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

// 测试链路里不真要音频内容，只要 `import x from '...wav?url'` 能解析、`x` 是字符串。
// 真资源在生产构建里由 webpack `asset/resource` 处理并落到 dist/assets/audio/。
require.extensions['.wav'] = function loadWavAsStubUrl(module) {
  module.exports = '';
};

require.extensions['.ts'] = function loadTypeScriptAsCommonJs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      jsx: ts.JsxEmit.Preserve,
    },
    fileName: filename,
  });

  module._compile(transpiled.outputText, filename);
};

require('./run-standalone-local-content-tests.ts');
