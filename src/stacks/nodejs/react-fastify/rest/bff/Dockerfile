FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8000

CMD ["npx", "tsx", "src/stacks/nodejs/react-fastify/rest/bff/src/server.ts"]
