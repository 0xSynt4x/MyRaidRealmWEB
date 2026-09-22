#!/usr/bin/env node
/**
 * 导出「英文块缺失」的词条清单（key + 中文原文），供翻译补齐
 *
 *   node scripts/i18n/export-missing.cjs [输出文件]
 *   默认输出到 Temp/i18n-missing.txt
 *
 * 只处理 messages 表（界面文案那张）—— 另外两张表的值是嵌套对象，补法不同。
 * 输出按模块前缀分组，方便分批翻译；补完的英文写进补丁文件后交给 apply-patch.cjs。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'src/i18n/index.ts');
const outFile = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(ROOT, 'Temp/i18n-missing.txt');

const src = fs.readFileSync(FILE, 'utf8');

// messages 是文件里第一对块：首个 'zh-CN': { 起，en 块紧随其后
const zhStart = src.indexOf("'zh-CN': {");
const enStart = src.indexOf('\n  en: {', zhStart);
const enEnd = src.indexOf('\n  },\n', enStart);
if (zhStart < 0 || enStart < 0 || enEnd < 0) throw new Error('定位 messages 块失败');

// 值可能是单引号或双引号（含撇号的条目 prettier 会换成双引号），两种都要认，
// 只认单引号会把整条漏掉 → 误判缺失 → 重复插入。
function parse(block) {
  const map = new Map();
  const re = /'([^']+)':\s*(?:\r?\n\s*)?(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while ((m = re.exec(block))) map.set(m[1], m[2] ?? m[3]);
  return map;
}

const zh = parse(src.slice(zhStart, enStart));
const en = parse(src.slice(enStart, enEnd));
const missing = [...zh.keys()].filter(k => !en.has(k));

const groups = new Map();
for (const k of missing) {
  const g = k.split('.').slice(0, 2).join('.');
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(k);
}

const out = [`缺失合计 ${missing.length} 条，分组 ${groups.size} 个`];
for (const [g, ks] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  out.push('', `## ${g}  (${ks.length})`);
  for (const k of ks) out.push(`${k}\t${zh.get(k)}`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out.join('\n') + '\n', 'utf8');

console.log('missing =', missing.length, '| groups =', groups.size);
console.log('->', path.relative(ROOT, outFile));
