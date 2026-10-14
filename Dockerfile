FROM node:22.23.3-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS builder
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --include=dev
COPY . .
# Only the public image hostname is needed at build time. Never pass secret build args.
ARG R2_PUBLIC_URL=""
ENV R2_PUBLIC_URL=$R2_PUBLIC_URL
RUN npm run prisma:generate && npm run build -- --webpack

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["npm", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
