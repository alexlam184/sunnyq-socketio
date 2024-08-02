FROM node:22.1.0
WORKDIR /app
COPY package*.json ./



RUN npm install
COPY . .
ENV PORT=3001
EXPOSE 3001
RUN npx tsc
CMD ["npm","start"]