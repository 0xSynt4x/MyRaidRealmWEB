// ESLint flat config (ESLint 9+)
// 面向 Vue 3 + TypeScript 独立项目。
// 现有代码库风格较宽松（noUnusedLocals=false、大量运行时 any），
// 因此这里以「捕获真实错误」为主，把容易大面积误报的风格类规则降级为 warn 或关闭，
// 保证 `pnpm lint` 可用而非一跑就是成百上千条噪音。

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // 全局忽略
    ignores: [
      'node_modules/**',
      'dist/**',
      'assets-design/**',
      'legacy-reference/**',
      '**/*.d.ts',
      // 本地排查脚本/截图目录。.gitignore 里已经忽略它，但 ESLint 不读 .gitignore，
      // 不显式排除的话本机 lint 会被几百条临时脚本噪音淹没，掩盖源码里的真实错误。
      'Temp/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    // Vue 单文件组件用 vue-eslint-parser，内部脚本交给 TS 解析器
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  {
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // 浏览器运行时
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Event: 'readonly',
        EventListener: 'readonly',
        CustomEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        AbortController: 'readonly',
        structuredClone: 'readonly',
        require: 'readonly',
        globalThis: 'readonly',
        // 项目/宿主注入的运行时全局（在 .d.ts 中声明，ESLint 不读 .d.ts，故显式列出）
        eventOn: 'readonly',
        EventOnReturn: 'readonly',
        StandaloneEventOnReturn: 'readonly',
        toastr: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
        _: 'readonly',
        z: 'readonly',
      },
    },
    rules: {
      // 项目大量使用运行时 any 与浏览器全局，降级为提示而非报错
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      // 已知技术债：App.vue 的向导显示判断在 computed 内写状态。
      // 属于真实反模式，但重构涉及核心开局逻辑，单独跟进；此处降级以免阻塞。
      'vue/no-side-effects-in-computed-properties': 'warn',
      // Vue：组件命名与属性顺序类规则降级，避免对存量组件大量报错
      'vue/multi-word-component-names': 'off',
      'vue/attributes-order': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'off',
    },
  },

  {
    // Node 脚本环境
    files: ['scripts/**/*.{cjs,js,ts}', '*.config.{ts,js,cjs,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        console: 'readonly',
        globalThis: 'writable',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // 关闭与 Prettier 冲突的格式化规则（放最后覆盖）
  prettier,
);
