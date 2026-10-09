/**
 * 纯前端轻量分词与 BM25 检索模块。
 *
 * 设计边界：
 * 1. 纯 TypeScript 实现，零外部依赖，毫秒级响应，浏览器与 Node 测试环境通用。
 * 2. 用于从长达数十至数百轮的历史小总结中，按当前情境（玩家输入、在场人物、地点）
 *    精准召回最相关的 3~5 条微观剧情事实与伏笔，彻底解决长轮次上下文爆炸与健忘。
 * 3. 采用中英混合分词（英文单词 + 中文 2-gram 与 1-gram），配合经典 BM25 算法及适度时效衰减。
 */

/** 基础停用词集合（过滤虚词、代词、高频无意义助词） */
const DEFAULT_STOP_WORDS = new Set<string>([
  '的',
  '了',
  '在',
  '是',
  '我',
  '你',
  '他',
  '她',
  '它',
  '们',
  '有',
  '和',
  '就',
  '不',
  '人',
  '都',
  '一',
  '一个',
  '上',
  '也',
  '很',
  '到',
  '说',
  '要',
  '去',
  '得',
  '着',
  '看',
  '过',
  '家',
  '下',
  '地',
  '对',
  '把',
  '那',
  '这',
  '与',
  '及',
  '等',
  '被',
  '自',
  '从',
  '向',
  '朝',
  '由',
  '但',
  '而',
  '或',
  '更',
  '又',
  '已',
  '经',
  '会',
  '可',
  '能',
  '好',
  '多',
  '少',
  '为',
  '以',
  '所',
  '其',
  '此',
  '并',
  '即',
  '若',
  '因',
  '果',
]);

/**
 * 轻量混合分词器。
 * - 英文/数字序列切分为小写单词；
 * - 中文连续串切分为 2-gram（双字重叠）与 1-gram（单字），剔除停用词与标点；
 * - 返回过滤后的 token 数组。
 */
export function tokenizeStandaloneText(text: string, stopWords: Set<string> = DEFAULT_STOP_WORDS): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const tokens: string[] = [];
  const normalized = text.toLowerCase();
  // 匹配连续的英文字母数字，或者连续的中文字符
  const segmentRegex = /([a-z0-9_]+)|([\u4e00-\u9fa5]+)/g;
  let match: RegExpExecArray | null = null;

  while ((match = segmentRegex.exec(normalized)) !== null) {
    const word = match[1];
    const cjk = match[2];

    if (word) {
      if (word.length >= 2 && !stopWords.has(word)) {
        tokens.push(word);
      }
    } else if (cjk) {
      const len = cjk.length;
      if (len === 1) {
        if (!stopWords.has(cjk)) {
          tokens.push(cjk);
        }
      } else {
        // 生成 2-gram
        for (let i = 0; i < len - 1; i++) {
          const bigram = cjk.slice(i, i + 2);
          tokens.push(bigram);
        }
        // 生成 1-gram（过滤单字停用词）
        for (let i = 0; i < len; i++) {
          const char = cjk[i];
          if (!stopWords.has(char)) {
            tokens.push(char);
          }
        }
      }
    }
  }

  return tokens;
}

export type StandaloneSearchDocument<T = unknown> = {
  id: string | number;
  text: string;
  /** 附加元数据（如原始 messageId、时间、角色） */
  meta?: T;
};

export type StandaloneSearchResult<T = unknown> = {
  id: string | number;
  text: string;
  score: number;
  meta?: T;
};

export type StandaloneBm25Options = {
  /** 词频饱和度参数，通常 1.2 ~ 2.0，默认 1.2 */
  k1?: number;
  /** 文档长度归一化参数，通常 0.75，默认 0.75 */
  b?: number;
  /** 最低召回得分阈值，低于此分数的文档不入选，默认 0.1 */
  minScore?: number;
  /** 最多返回条数，默认 4 */
  topK?: number;
  /** 是否启用时效性加权（越靠近末尾索引文档得分微升），默认 true */
  boostRecency?: boolean;
};

/**
 * 纯前端 BM25 检索算法。
 * 从一组文档中，根据查询文本检索出相关度最高的前 Top-K 条文档。
 */
export function searchStandaloneBm25<T = unknown>(
  documents: StandaloneSearchDocument<T>[],
  query: string,
  options: StandaloneBm25Options = {},
): StandaloneSearchResult<T>[] {
  if (!documents || documents.length === 0 || !query || !query.trim()) {
    return [];
  }

  const k1 = options.k1 ?? 1.2;
  const b = options.b ?? 0.75;
  const minScore = options.minScore ?? 0.1;
  const topK = options.topK ?? 4;
  const boostRecency = options.boostRecency ?? true;

  const N = documents.length;
  // 1. 文档分词与统计
  const docTokensList: string[][] = [];
  const docLengths: number[] = [];
  let totalDocLen = 0;
  // 文档频率 df: 包含词 term 的文档数量
  const docFreq: Map<string, number> = new Map();

  for (let i = 0; i < N; i++) {
    const tokens = tokenizeStandaloneText(documents[i].text);
    docTokensList.push(tokens);
    const len = tokens.length;
    docLengths.push(len);
    totalDocLen += len;

    const seenInDoc = new Set<string>(tokens);
    for (const term of seenInDoc) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  const avgdl = totalDocLen / Math.max(1, N);

  // 2. 查询分词与词频
  const queryTokens = tokenizeStandaloneText(query);
  if (queryTokens.length === 0) {
    return [];
  }

  // 3. 计算每个词的 IDF（采用带平滑的标准公式）
  const idfMap: Map<string, number> = new Map();
  for (const term of queryTokens) {
    if (idfMap.has(term)) continue;
    const df = docFreq.get(term) ?? 0;
    // 经典 BM25 IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    idfMap.set(term, Math.max(0, idf));
  }

  // 4. 对每个文档计算得分
  const scoredResults: StandaloneSearchResult<T>[] = [];

  for (let i = 0; i < N; i++) {
    const tokens = docTokensList[i];
    const docLen = docLengths[i];
    if (docLen === 0) continue;

    // 统计当前文档内的词频 tf
    const tfMap: Map<string, number> = new Map();
    for (const token of tokens) {
      tfMap.set(token, (tfMap.get(token) ?? 0) + 1);
    }

    let rawScore = 0;
    for (const term of queryTokens) {
      const tf = tfMap.get(term) ?? 0;
      if (tf <= 0) continue;

      const idf = idfMap.get(term) ?? 0;
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / Math.max(1, avgdl)));
      rawScore += idf * (numerator / denominator);
    }

    if (rawScore >= minScore) {
      // 时效衰减/加权：如果启用，靠后的文档（索引大，越近期）获得微量加成 (最高 +20%)
      const recencyMultiplier = boostRecency ? 1 + (i / Math.max(1, N - 1)) * 0.2 : 1;
      const finalScore = rawScore * recencyMultiplier;

      scoredResults.push({
        id: documents[i].id,
        text: documents[i].text,
        score: finalScore,
        meta: documents[i].meta,
      });
    }
  }

  // 5. 按最终得分降序排序，截取 topK
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.slice(0, topK);
}
