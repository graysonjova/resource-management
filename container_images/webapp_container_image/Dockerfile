# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS dependencies
WORKDIR /app/resource-app
COPY resource-app/package.json resource-app/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app/resource-app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/resource-app/node_modules ./node_modules
COPY resource-app/ ./

# These files are also copied into the runtime stage. Including them here keeps
# any build-time route analysis consistent with the deployed container.
COPY ["Dummy Data Generated.xlsx", "/app/Dummy Data Generated.xlsx"]
COPY ["Dummy Data Generated Resumes.pptx", "/app/Dummy Data Generated Resumes.pptx"]

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app/resource-app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_XLSX_PATH="/app/Dummy Data Generated.xlsx" \
    DATA_PPTX_PATH="/app/Dummy Data Generated Resumes.pptx"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/resource-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/resource-app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs ["/app/Dummy Data Generated.xlsx", "/app/Dummy Data Generated.xlsx"]
COPY --from=builder --chown=nextjs:nodejs ["/app/Dummy Data Generated Resumes.pptx", "/app/Dummy Data Generated Resumes.pptx"]

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
