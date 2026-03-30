FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npx", "tsx", "src/stacks/nodejs/react-fastify/rest/web/server.ts"]
