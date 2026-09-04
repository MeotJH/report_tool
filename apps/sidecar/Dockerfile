# report-tool 사이드카
#
# 호스트 앱이 Node가 아닐 때(Spring·Flask 등) 그 옆에서 도는 프로세스다.
# 하는 일은 발행본 PDF를 만들고 서명을 받는 것뿐이며, 급여 DB도 파일 저장소도
# 모른다 — 필요한 자료는 호스트 REST로 되물어본다.

FROM node:20-alpine AS build
WORKDIR /app

# 의존성 목록만 먼저 넣는다. 소스가 바뀌어도 이 층은 다시 받지 않는다.
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/renderer/package.json ./packages/renderer/
COPY packages/server/package.json ./packages/server/
COPY packages/designer/package.json ./packages/designer/
COPY packages/viewer/package.json ./packages/viewer/
COPY apps/admin/package.json ./apps/admin/
COPY apps/sidecar/package.json ./apps/sidecar/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/core ./packages/core
COPY packages/renderer ./packages/renderer
COPY packages/server ./packages/server
COPY apps/sidecar ./apps/sidecar
RUN npm run build:core && npm run build:renderer && npm run build:server && npm run build:sidecar

# 실행 이미지에는 빌드 도구를 넣지 않는다.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/renderer/package.json ./packages/renderer/
COPY packages/server/package.json ./packages/server/
COPY apps/sidecar/package.json ./apps/sidecar/
RUN npm ci --omit=dev --workspace @report-tool/sidecar --include-workspace-root

COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/renderer/dist ./packages/renderer/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/apps/sidecar/dist ./apps/sidecar/dist

# 발행본에 임베딩할 TTF를 여기 마운트하거나 이미지에 함께 넣는다.
# 한글은 반드시 TTF여야 한다 — OTF는 임베딩 중 예외가 난다.
ENV FONT_DIR=/app/fonts
VOLUME ["/app/fonts"]

# root로 돌리지 않는다. 이 프로세스는 바깥에서 오는 요청을 받는다.
USER node
EXPOSE 8787

# 오케스트레이터가 이걸 보고 프로세스를 살릴지 정한다.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/sidecar/dist/main.js"]
