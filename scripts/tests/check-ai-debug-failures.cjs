/**
 * AI 调试「失败请求留档」检查 —— 纯断言，不依赖游戏运行时，不联网、不写文件。
 *
 * 跑法：node scripts/tests/check-ai-debug-failures.cjs
 *
 * 为什么要单独跑这个：`src/utils/standaloneAiDebugFailures.ts` 是「失败的请求也要留档」
 * 这条链路的唯一落盘口，出问题的方式都很安静 —— 截断上限写错会撑爆 IndexedDB、
 * 滚动逻辑写反会把最新一条丢掉、读取路径抛错会让整个调试页崩。
 * 这类错**类型检查抓不到**，只能靠断言兜。
 *
 * 用跟 check-weather-family.cjs 同一套手法：typescript 的 transpileModule 直接吃 .ts 源码。
 * 区别是本模块依赖存储层，所以额外传一个内存版 `require` 垫片把 `./standaloneStorage` 换掉，
 * 让读写都落在进程内的 Map 上，既不用起浏览器也不污染真实存储。
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const srcPath = path.resolve(__dirname, '../../src/utils/standaloneAiDebugFailures.ts');
const source = fs.readFileSync(srcPath, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: srcPath,
}).outputText;

// ---- 内存版存储层替身（只实现本模块用到的那三个同步接口）----
const memory = new Map();
const storageStub = {
  readStorageSync(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  writeStorageSync(key, value) {
    memory.set(key, value);
  },
  removeStorageSync(key) {
    memory.delete(key);
  },
};

function localRequire(request) {
  if (request === './standaloneStorage') {
    return storageStub;
  }
  return require(request);
}

const shim = { exports: {} };
new Function('exports', 'module', 'require', js)(shim.exports, shim, localRequire);
const {
  STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY,
  MAX_STANDALONE_AI_DEBUG_FAILURES,
  STANDALONE_FAILURE_REQUEST_BODY_LIMIT,
  STANDALONE_FAILURE_RAW_RESPONSE_LIMIT,
  STANDALONE_FAILURE_MESSAGE_CONTENT_LIMIT,
  STANDALONE_FAILURE_TRUNCATION_MARK,
  loadStandaloneAiDebugFailures,
  appendStandaloneAiDebugFailure,
  clearStandaloneAiDebugFailures,
  readStandaloneProviderFailureTrace,
  truncateFailureTraceForStorage,
  pushFailureRecord,
} = shim.exports;

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected);
    passed += 1;
  } catch {
    failures.push(`${label}\n      期望 ${JSON.stringify(expected)} / 实得 ${JSON.stringify(actual)}`);
  }
}

function checkOk(label, condition, detail = '') {
  if (condition) {
    passed += 1;
  } else {
    failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

function makeTrace(overrides = {}) {
  return {
    api_label: 'openai_compatible:test-model',
    api_mode: 'openai_compatible',
    requested_at: '2026-10-01T01:00:00.000Z',
    transport_mode: 'non_streaming',
    request_messages: [{ role: 'user', content: 'hi' }],
    request_body_text: '{"model":"test-model"}',
    raw_response_text: '',
    extracted_text: '',
    error_message: null,
    ...overrides,
  };
}

// ---- 1. 截断：超长砍掉 + 留标记，短的必须原样 ----
const longBody = 'A'.repeat(STANDALONE_FAILURE_REQUEST_BODY_LIMIT + 500);
const longRaw = 'B'.repeat(STANDALONE_FAILURE_RAW_RESPONSE_LIMIT + 500);
const longMessage = 'C'.repeat(STANDALONE_FAILURE_MESSAGE_CONTENT_LIMIT + 500);
const longError = 'D'.repeat(STANDALONE_FAILURE_RAW_RESPONSE_LIMIT + 500);

const truncated = truncateFailureTraceForStorage(
  makeTrace({
    request_body_text: longBody,
    raw_response_text: longRaw,
    error_message: longError,
    request_messages: [
      { role: 'system', content: longMessage },
      { role: 'user', content: 'short' },
    ],
  }),
);

checkOk(
  '超长 request_body_text 被砍到上限 + 标记',
  truncated.request_body_text.length ===
    STANDALONE_FAILURE_REQUEST_BODY_LIMIT + STANDALONE_FAILURE_TRUNCATION_MARK.length,
  `实得长度 ${truncated.request_body_text.length}`,
);
checkOk(
  '超长 request_body_text 带截断标记',
  truncated.request_body_text.endsWith(STANDALONE_FAILURE_TRUNCATION_MARK),
);
checkOk(
  '超长 raw_response_text 被砍到上限 + 标记',
  truncated.raw_response_text.length ===
    STANDALONE_FAILURE_RAW_RESPONSE_LIMIT + STANDALONE_FAILURE_TRUNCATION_MARK.length,
);
checkOk(
  '超长 error_message 被砍到上限 + 标记',
  truncated.error_message.length ===
    STANDALONE_FAILURE_RAW_RESPONSE_LIMIT + STANDALONE_FAILURE_TRUNCATION_MARK.length,
);
checkOk(
  '超长 messages[].content 被砍到上限 + 标记',
  truncated.request_messages[0].content.length ===
    STANDALONE_FAILURE_MESSAGE_CONTENT_LIMIT + STANDALONE_FAILURE_TRUNCATION_MARK.length,
);
check('短字段原样保留', truncated.request_messages[1].content, 'short');
check('截断不该改动其它元信息', truncated.api_label, 'openai_compatible:test-model');

// 不超限的 trace 必须逐字节原样（不能顺手加标记）
const untouched = truncateFailureTraceForStorage(makeTrace());
check('未超限的 request_body_text 原样', untouched.request_body_text, '{"model":"test-model"}');
check('未超限的 error_message 保持 null', untouched.error_message, null);

// ---- 2. 滚动：新的在最前，超过上限丢最旧 ----
function makeRecord(id) {
  return {
    id,
    occurred_at: '2026-10-01T01:00:00.000Z',
    pass: 'main_pass',
    attempt: 1,
    total_attempts: 1,
    http_status: null,
    trace: makeTrace(),
  };
}

let rolling = [];
for (let index = 1; index <= 5; index += 1) {
  rolling = pushFailureRecord(rolling, makeRecord(`r${index}`));
}
check('5 条时数量正确', rolling.length, 5);
check('新的排在最前', rolling[0].id, 'r5');
check('顺序稳定（从新到旧）', rolling.map(item => item.id), ['r5', 'r4', 'r3', 'r2', 'r1']);

let overflowed = [];
for (let index = 1; index <= MAX_STANDALONE_AI_DEBUG_FAILURES + 5; index += 1) {
  overflowed = pushFailureRecord(overflowed, makeRecord(`r${index}`));
}
check('超过上限后稳定在上限条数', overflowed.length, MAX_STANDALONE_AI_DEBUG_FAILURES);
check('最旧的那条被滚掉', overflowed.some(item => item.id === 'r1'), false);
check('最新的那条还在最前', overflowed[0].id, `r${MAX_STANDALONE_AI_DEBUG_FAILURES + 5}`);

// ---- 3. 读取路径：任何读不动的输入都返回 []，不许抛 ----
memory.clear();
check('没有数据时返回空数组', loadStandaloneAiDebugFailures(), []);

memory.set(STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY, 'not-an-array');
check('存进去不是数组时返回空数组', loadStandaloneAiDebugFailures(), []);

memory.set(STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY, [{ garbage: true }, null, 42]);
check('数组里全是垃圾时过滤成空数组', loadStandaloneAiDebugFailures(), []);

memory.set(STANDALONE_AI_DEBUG_FAILURES_STORAGE_KEY, [makeRecord('good'), { garbage: true }]);
check('合法条目留下、垃圾条目丢掉', loadStandaloneAiDebugFailures().map(item => item.id), ['good']);

// 存储层本身抛错时也不能把调用方带崩
// （这条会触发模块内的 console.warn，属于预期噪音，断言期间临时静音）
const originalRead = storageStub.readStorageSync;
const originalWarn = console.warn;
console.warn = () => {};
storageStub.readStorageSync = () => {
  throw new Error('模拟存储层异常');
};
check('存储层抛错时返回空数组', loadStandaloneAiDebugFailures(), []);
storageStub.readStorageSync = originalRead;
console.warn = originalWarn;

// ---- 4. 追加 → 读回 → 清空（端到端往返）----
memory.clear();
const appended = appendStandaloneAiDebugFailure({
  pass: 'main_pass',
  attempt: 2,
  totalAttempts: 3,
  trace: makeTrace({ http_status: 401, error_message: 'HTTP 401 Unauthorized' }),
});
checkOk('追加返回了记录', appended !== null);
check('记录里的 pass 正确', appended.pass, 'main_pass');
check('记录里的 attempt/total 正确', [appended.attempt, appended.total_attempts], [2, 3]);
check('http_status 从 trace 上取', appended.http_status, 401);
checkOk('id 非空', typeof appended.id === 'string' && appended.id.length > 0);
checkOk('occurred_at 是 ISO 串', !Number.isNaN(Date.parse(appended.occurred_at)));

const readBack = loadStandaloneAiDebugFailures();
check('读回一条', readBack.length, 1);
check('读回的内容一致', readBack[0].id, appended.id);

appendStandaloneAiDebugFailure({ pass: 'variable_update_pass', attempt: 1, totalAttempts: 1, trace: makeTrace() });
check('再追加一条后共两条', loadStandaloneAiDebugFailures().length, 2);
check('最新的排在最前', loadStandaloneAiDebugFailures()[0].pass, 'variable_update_pass');

clearStandaloneAiDebugFailures();
check('清空后为空', loadStandaloneAiDebugFailures(), []);

// ---- 5. 从异常上取回 trace ----
const wrapped = new Error('HTTP 500 Boom');
wrapped.standaloneDebugTrace = makeTrace({ error_message: 'HTTP 500 Boom' });
check('能从 Error 上取回 trace', readStandaloneProviderFailureTrace(wrapped).error_message, 'HTTP 500 Boom');
check('普通 Error 取不到 trace 时返回 null', readStandaloneProviderFailureTrace(new Error('plain')), null);
check('非对象入参返回 null', readStandaloneProviderFailureTrace('oops'), null);
check('null 入参返回 null', readStandaloneProviderFailureTrace(null), null);

if (failures.length) {
  console.error(`AI 调试失败留档检查：${passed} 项通过，${failures.length} 项失败\n`);
  failures.forEach(item => console.error(`  ✗ ${item}\n`));
  process.exit(1);
}
console.log(`AI 调试失败留档检查：${passed} 项全部通过`);
