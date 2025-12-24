# ---- build stage ----
  FROM node:20-alpine AS build
  WORKDIR /app
  
  # 启用 pnpm（Node 20 推荐用 corepack）
  RUN corepack enable
  
  # 先拷贝依赖描述与锁文件，利用缓存
  COPY package.json pnpm-lock.yaml ./
  
  # 按 lockfile 安装依赖（可复现）
  RUN pnpm install --frozen-lockfile
  
  # 再拷贝源码
  COPY . .
  
  # 构建
  RUN pnpm run build
  
  
  # ---- runtime stage ----
  FROM node:20-alpine
  WORKDIR /app
  
  ENV NODE_ENV=production
  RUN corepack enable
  
  # 运行时只装生产依赖
  COPY package.json pnpm-lock.yaml ./
  RUN pnpm install --frozen-lockfile --prod
  
  # 拷贝构建产物
  COPY --from=build /app/dist ./dist
  
  EXPOSE 3008
  CMD ["node", "dist/main.js"]
  