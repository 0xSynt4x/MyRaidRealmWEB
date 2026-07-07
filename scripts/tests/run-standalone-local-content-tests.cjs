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

  if (typeof request === 'string' && path.basename(request) === 'schema' && path.extname(request) === '') {
    try {
      return originalResolveFilename.call(this, `${request}.ts`, parent, isMain, options);
    } catch (error) {
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
