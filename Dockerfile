FROM node:22.1.0
WORKDIR /app
COPY package*.json ./



RUN npm install
COPY . .
ENV PORT=8080
EXPOSE 8080
RUN npx tsc
CMD ["npm","start"]