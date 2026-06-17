FROM node:20-alpine as builder
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

WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

