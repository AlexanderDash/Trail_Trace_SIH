FROM node:20-alpine

# Install Python3, pip, openssl, and build dependencies
RUN apk add --no-cache python3 py3-pip openssl

WORKDIR /app

# 1. Copy dependencies manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY apps/python-engine/requirements.txt ./apps/python-engine/

# 2. Install Node and Python dependencies
RUN npm install
RUN pip install --no-cache-dir --break-system-packages -r apps/python-engine/requirements.txt

# 3. Copy application source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY apps/python-engine ./apps/python-engine
COPY sample_data ./sample_data

# 4. Generate Prisma Client, Migrate SQLite & Seed Demo Data
ENV DATABASE_URL="file:./dev.db"
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx prisma db push --skip-generate
RUN npx tsx prisma/seed.ts

WORKDIR /app
RUN npm run build

# 5. Environment configuration
ENV PORT=10000
ENV NODE_ENV=production
ENV CORS_ORIGIN="*"
ENV PYTHON_ENGINE_URL="http://127.0.0.1:8000"

EXPOSE 10000

# 6. Startup script running Python engine in background & Express app serving API + Frontend
CMD sh -c "python3 -m uvicorn main:app --app-dir apps/python-engine --host 127.0.0.1 --port 8000 & npm run start -w @anvesh/api"
