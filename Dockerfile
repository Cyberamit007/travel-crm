FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
# Install all deps (including devDeps) so prisma CLI is available for generate
RUN npm install

COPY backend/ ./
# Generate Prisma client, then strip devDeps to keep image small
RUN npx prisma generate && npm prune --omit=dev

EXPOSE 5000
CMD ["npm", "start"]
