import ejsBrowserRuntime from '../../node_modules/ejs/ejs.min.js';
import type { MessageRecord } from '../stores/messages';
import type { WorldDifficulty } from '../stores/settings';

export type StandaloneLocalContentRenderContext = {
  statData: unknown;
  messages: MessageRecord[];
  latestUserMessage: MessageRecord | null;
  worldDifficulty: WorldDifficulty;
};

type TemplateUtilityContext = {
  stat_data: unknown;
  latest_user_message: string;
  recent_messages: MessageRecord[];
  _: {
    get: (object: unknown, path: string, defaultValue?: unknown) => unknown;
    random: (min: number, max?: number) => number;
  };
  getvar: (path: string, options?: { defaults?: unknown }) => unknown;
};

export type StandaloneLocalContentRenderResult = {
  content: string;
  warning: string | null;
};

type EjsBrowserModule = {
  render: (template: string, data?: Record<string, unknown>, options?: Record<string, unknown>) => string;
};

const ejs = ejsBrowserRuntime as EjsBrowserModule;

function fallbackGet(object: unknown, path: string, defaultValue?: unknown): unknown {
  const normalizedSegments = path
    .split('.')
    .map(segment => segment.trim())
    .filter(Boolean);

  let current: unknown = object;
  for (const segment of normalizedSegments) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current === undefined ? defaultValue : current;
}

function createTemplateUtilityContext(renderContext: StandaloneLocalContentRenderContext): TemplateUtilityContext {
  const runtimeRoot = {
    stat_data: renderContext.statData,
  };

  const templateLodash = {
    get(object: unknown, path: string, defaultValue?: unknown) {
      if (typeof _.get === 'function') {
        return _.get(object, path, defaultValue);
      }

      return fallbackGet(object, path, defaultValue);
    },
    random(min: number, max?: number) {
      if (typeof _.random === 'function') {
        if (typeof max === 'number') {
          return _.random(min, max);
        }

        return _.random(min);
      }

      const resolvedMax = typeof max === 'number' ? max : min;
      const resolvedMin = typeof max === 'number' ? min : 0;
      return Math.floor(Math.random() * (resolvedMax - resolvedMin + 1)) + resolvedMin;
    },
  };

  return {
    stat_data: renderContext.statData,
    latest_user_message: renderContext.latestUserMessage?.content_text ?? '',
    recent_messages: renderContext.messages,
    _: templateLodash,
    getvar(path: string, options?: { defaults?: unknown }) {
      return templateLodash.get(runtimeRoot, path, options?.defaults);
    },
  };
}

export function renderStandaloneLocalContentTemplate(input: {
  template: string;
  renderContext: StandaloneLocalContentRenderContext;
  sourceName?: string;
}): StandaloneLocalContentRenderResult {
  const { template, renderContext, sourceName } = input;
  if (!template.includes('<%')) {
    return {
      content: template,
      warning: null,
    };
  }

  try {
    const rendered = ejs.render(template, createTemplateUtilityContext(renderContext), {
      _with: true,
      async: false,
      rmWhitespace: false,
      strict: false,
      filename: sourceName,
      escape(value: unknown) {
        return String(value ?? '');
      },
    });

    return {
      content: String(rendered ?? ''),
      warning: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: template,
      warning: `模板渲染失败：${message}`,
    };
  }
}
