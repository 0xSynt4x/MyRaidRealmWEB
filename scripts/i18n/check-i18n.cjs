#!/usr/bin/env node
/**
 * i18n 词条体检 —— 一条命令查三件事
 *
 *   npm run check:i18n
 *   或 node scripts/i18n/check-i18n.cjs
 *
 * 查什么：
 *   ① 三张词条表的中英 key 是否一一对应
 *      （messages / enumDisplayMessages / fieldMessages，缺 key 会回退显示中文）
 *   ② 英文块里有没有「值仍然是中文」的条目（key 对但没翻，一样会显示中文）
 *   ③ 中英条目的 {占位符} 是否一一对应（翻译时最容易丢的东西）
 *
 * 退出码：全过 0，有任何问题 1 —— 可以直接挂 CI / pre-commit。
 * 详细报告（含中文原文）写到 Temp/i18n-report.txt，控制台只打 ASCII 摘要
 * —— 本机 bash 打中文会乱码，别靠控制台看内容。
 *
 * ⚠️ 为什么按「行 + 块区间」扫，而不是把文件解析成对象：
 *    这个文件里有三张结构完全不同的表（纯字符串 / 嵌套对象 / {label,placeholder}），
 *    值还可能是单引号或双引号。逐行取 key 最稳，且不依赖类型。
 * ⚠️ 定位必须精确：文件里有三对 'zh-CN': { / en: { 块，用 lastIndexOf 会锚到最后一对，
 *    把内容插错表 —— 必须按出现顺序成对切。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FILE = path.join(ROOT, 'src/i18n/index.ts');
const REPORT = path.join(ROOT, 'Temp/i18n-report.txt');

const TABLE_NAMES = ['messages', 'enumDisplayMessages', 'fieldMessages'];
const CJK = /[\u4e00-\u9fff]/;

const lines = fs.readFileSync(FILE, 'utf8').split(/\r?\n/);

// —— 按出现顺序把三对 zh / en 块切出来 ——
const marks = [];
lines.forEach((l, i) => {
  if (/^  'zh-CN': \{$/.test(l)) marks.push({ i, locale: 'zh' });
  else if (/^  en: \{$/.test(l)) marks.push({ i, locale: 'en' });
});

const pairs = [];
for (let k = 0; k < marks.length; k++) {
  if (marks[k].locale !== 'zh') continue;
  const next = marks[k + 1];
  if (!next || next.locale !== 'en') continue;
  const end = marks[k + 2] ? marks[k + 2].i - 1 : lines.length - 1;
  pairs.push({
    name: TABLE_NAMES[pairs.length] || `table${pairs.length}`,
    zh: { start: marks[k].i, end: next.i - 1 },
    en: { start: next.i, end },
  });
  k++;
}

// 一行只取一个 key：先认「带引号的 key」，再认「中文 key」（枚举表的 key 本身就是中文）
function keysOf(block) {
  const set = new Set();
  for (let i = block.start + 1; i <= block.end; i++) {
    const l = lines[i];
    let m = l.match(/^\s+'([^']+)':/);
    if (m) {
      set.add(m[1]);
      continue;
    }
    m = l.match(/^\s+([\u4e00-\u9fff][^:'"]*?):\s/);
    if (m) set.add(m[1].trim());
  }
  return set;
}

const problems = [];
const report = [];
const summary = [];
let exitCode = 0;

// ① key 对齐
for (const p of pairs) {
  const zh = keysOf(p.zh);
  const en = keysOf(p.en);
  const missing = [...zh].filter((k) => !en.has(k));
  const extra = [...en].filter((k) => !zh.has(k));
  const ok = missing.length === 0 && extra.length === 0;
  if (!ok) exitCode = 1;
  summary.push(
    `${p.name.padEnd(20)} zh ${String(zh.size).padStart(4)} / en ${String(en.size).padStart(4)}   ${ok ? 'OK' : 'FAIL'}`,
  );
  if (!ok) {
    problems.push(`[${p.name}] key 不对齐：英文缺 ${missing.length} 条、多 ${extra.length} 条`);
    report.push(`## ${p.name} —— 英文缺的 key（会回退显示中文）`);
    missing.forEach((k) => report.push('  ' + k));
    report.push(`## ${p.name} —— 英文多出来的 key`);
    extra.forEach((k) => report.push('  ' + k));
  }
}

// ② 英文块里值仍含中文（跳过注释行）
const zhLeft = [];
for (const p of pairs) {
  for (let i = p.en.start + 1; i <= p.en.end; i++) {
    const l = lines[i];
    if (/^\s*\/\*/.test(l)) continue; // 注释不算
    const colon = l.indexOf(':');
    const tail = colon >= 0 ? l.slice(colon + 1) : l;
    if (CJK.test(tail)) zhLeft.push(`${p.name}\tline ${i + 1}\t${l.trim()}`);
  }
}
summary.push(`英文块残留中文值        ${String(zhLeft.length).padStart(4)}      ${zhLeft.length ? 'WARN' : 'OK'}`);
if (zhLeft.length) {
  // 专有名词（如社区名）属有意保留，只提醒不判失败
  report.push('## 英文块里值仍含中文（专有名词可忽略）');
  zhLeft.forEach((r) => report.push('  ' + r));
}

// ③ 占位符（只查 messages —— 另外两张表的值是嵌套对象，没有占位符）
const msgPair = pairs[0];
function valuesOf(block) {
  const map = new Map();
  const text = lines.slice(block.start + 1, block.end + 1).join('\n');
  const re = /'([^']+)':\s*(?:\r?\n\s*)?(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
  let m;
  while ((m = re.exec(text))) map.set(m[1], m[2] ?? m[3]);
  return map;
}
const zhVals = valuesOf(msgPair.zh);
const enVals = valuesOf(msgPair.en);
const phOf = (s) => [...(s.match(/\{[a-zA-Z0-9_]+\}/g) || [])].sort().join(',');
const phBad = [];
for (const [k, v] of zhVals) {
  const e = enVals.get(k);
  if (e === undefined) continue;
  if (phOf(v) !== phOf(e)) phBad.push(`${k}\n    zh: ${phOf(v) || '(无)'}\n    en: ${phOf(e) || '(无)'}`);
}
if (phBad.length) exitCode = 1;
summary.push(`占位符不一致            ${String(phBad.length).padStart(4)}      ${phBad.length ? 'FAIL' : 'OK'}`);
if (phBad.length) {
  problems.push(`[messages] 占位符不一致 ${phBad.length} 条`);
  report.push('## 占位符不一致');
  phBad.forEach((r) => report.push('  ' + r));
}

// —— 输出 ——
console.log('=== i18n check ===');
summary.forEach((s) => console.log('  ' + s));
console.log('  result: ' + (exitCode === 0 ? 'PASS' : 'FAIL'));
if (problems.length) {
  console.log('--- problems ---');
  problems.forEach((p) => console.log('  ' + p));
}

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(
  REPORT,
  ['# i18n 体检报告', '', ...summary, '', ...report].join('\n') + '\n',
  'utf8',
);
console.log('report -> Temp/i18n-report.txt');

process.exit(exitCode);
