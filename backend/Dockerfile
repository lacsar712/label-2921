FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com
RUN npm install --legacy-peer-deps

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate

EXPOSE 8000

# 在启动时直接通过 --url 注入连接串，确保 prisma db push 成功
CMD ["sh", "-c", "npx prisma db push --accept-data-loss --url \"$DATABASE_URL\" && npm run start"]
