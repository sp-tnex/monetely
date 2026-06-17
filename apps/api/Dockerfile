FROM node:20-alpine
WORKDIR /app

COPY package*.json ./

COPY packages/tsconfig/package*.json ./packages/tsconfig/
COPY packages/eslint-config/package*.json ./packages/eslint-config/
COPY packages/shared/package*.json ./packages/shared/

COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm install

COPY . .

RUN npm run build --workspace=@monetely/shared

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]

