FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm set registry https://mirror-npm.runflare.com

RUN npm i --verbose

COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main.js"]
