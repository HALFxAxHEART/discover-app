FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY tsconfig.json ./
CMD ["bun", "run", "src/index.ts"]
