FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate && npm prune --omit=dev

EXPOSE 5000
CMD ["npm", "start"]
