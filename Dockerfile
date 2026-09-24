# 生产镜像：依赖解析、构建、运行全部在容器内完成。
#
# 宿主只需要 docker，不需要 node / pnpm —— 本仓 pin 了 pnpm@11.5.2，
# 宿主环境不一定装得上（只读文件系统会直接失败）。
#
# 构建产物不是单文件：index.html 内联了 JS/CSS，但图片、音频、预设包
# 以同级相对路径躺在 dist/assets/ 与 dist/preset-package/，所以必须整目录部署。

# ---------- 阶段一：构建 ----------
FROM node:22-alpine AS builder

# 本仓 packageManager 字段 pin 的是 pnpm@11.5.2，用 corepack 按 lockfile 激活，
# 避免镜像自带的 pnpm 版本和 lockfile 对不上导致 install 行为漂移。
RUN corepack enable

WORKDIR /app

# 只先拷依赖清单，让这一层能被 Docker 缓存：
# 源码改动不会导致重新解析依赖，反复 build 时省掉最慢的一步。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# pnpm-workspace.yaml 里关了 verifyDepsBeforeRun，install 必须显式跑。
# --frozen-lockfile 保证容器内解析结果和 lockfile 完全一致。
RUN pnpm install --frozen-lockfile

# 源码。.dockerignore 已经把 node_modules / dist / .git 挡在外面。
COPY . .

# 生产构建。package.json 的 build 脚本是
#   webpack(standalone) && build:preset
# 顺序不能反 —— 主构建会清空整个 dist/，预设包必须在它之后产出。
RUN pnpm build

# ---------- 阶段二：运行 ----------
FROM nginx:alpine AS runtime

# 只搬构建产物，源码、依赖、构建工具都不进运行镜像。
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# 用 wget 探活：nginx:alpine 自带 wget（busybox），不额外装 curl。
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
