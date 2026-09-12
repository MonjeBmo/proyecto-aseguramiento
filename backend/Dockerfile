FROM node:20-alpine

WORKDIR /app

# Copiar manifiestos primero para cachear la capa de dependencias
COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
