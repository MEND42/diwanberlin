FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY src ./src

# Expose app port
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
