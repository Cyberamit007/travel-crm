FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate

EXPOSE 5000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
