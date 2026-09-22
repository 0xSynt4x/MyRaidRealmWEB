#!/usr/bin/env node
/**
 * 把补丁里的英文词条插进 messages 表的 en 块末尾
 *
 *   node scripts/i18n/apply-patch.cjs [补丁文件]     默认 Temp/en-patch.txt
 *
 * 补丁格式：TS 片段，每行一条 `'key': 'English',`，可夹 /* 分组注释 *\/。
 *
 * 🔴 插入前先对账：补丁的 key 集合必须与「真实缺失」**完全一致** ——
 *    多一条（英文块其实已有，被解析漏判了）或少一条，都直接报错退出、不写文件。
 *    这步是必需的：曾经因为「值用双引号」的条目被解析漏掉，重复插入 4 条，
 *    结果 tsc 报 TS1117 对象重名，白跑一轮。
 *
 * 定位也必须精确：文件里有三对 'zh-CN': { / en: { 块，
 * 用 lastIndexOf('\n  },\n') 会锚到最后一对（fieldMessages），内容插错表 → TS2559。
 *
 * 写入前会把原文件备份到 Temp/i18n-index.bak.ts。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'src/i18n/index.ts');
const BACKUP = path.join(ROOT, 'Temp/i18n-index.bak.ts');
const patchFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(ROOT, 'Temp/en-patch.txt');

const src = fs.readFileSync(FILE, 'utf8');

const zhStart = src.indexOf("'zh-CN': {");
const enStart = src.indexOf('\n  en: {', zhStart);
const enEnd = src.indexOf('\n  },\n', enStart);
if (zhStart < 0 || enStart < 0 || enEnd < 0) throw new Error('定位 messages 块失败');

function parse(block) {
  const map = new Map();
  const re = /'([^']+)':\s*(?:\r?\n\s*)?(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while ((m = re.exec(block))) map.set(m[1], m[2] ?? m[3]);
  return map;
}

const zh = parse(src.slice(zhStart, enStart));
const en = parse(src.slice(enStart, enEnd));
const missing = new Set([...zh.keys()].filter(k => !en.has(k)));

const patch = fs.readFileSync(patchFile, 'utf8').replace(/\r\n/g, '\n');
const patchKeys = patch
  .split('\n')
  .map(l => {
    const m = l.match(/^\s+'([^']+)':/);
    return m ? m[1] : null;
  })
  .filter(Boolean);

// —— 对账 ——
const redundant = patchKeys.filter(k => !missing.has(k));
const untouched = [...missing].filter(k => !patchKeys.includes(k));

console.log('patch keys =', patchKeys.length, '| real missing =', missing.size);
if (redundant.length || untouched.length) {
  console.log('!! 对账失败，未写入任何内容');
  redundant.forEach(k => console.log('   REDUNDANT（英文块已有，必须从补丁里删）: ' + k));
  untouched.forEach(k => console.log('   UNTRANSLATED（缺失但补丁没翻）: ' + k));
  process.exit(1);
}

// —— 备份 + 插入 ——
fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
fs.writeFileSync(BACKUP, src, 'utf8');

const insert = '\n\n' + patch.replace(/\n+$/, '') + '\n';
fs.writeFileSync(FILE, src.slice(0, enEnd) + insert + src.slice(enEnd), 'utf8');

console.log('inserted keys =', patchKeys.length);
console.log('backup -> Temp/i18n-index.bak.ts');
console.log('下一步：npm run format && npm run typecheck && npm run check:i18n');
