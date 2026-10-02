FROM node:20-alpine

WORKDIR /app

# Install openssl for prisma engine on alpine
RUN apk add --no-cache openssl

# Copy root package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

# Install dependencies across workspaces
RUN npm install

# Copy source codes
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared and generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production
ENV DATABASE_URL="file:./prisma/dev.db"

CMD ["npm", "start"]
