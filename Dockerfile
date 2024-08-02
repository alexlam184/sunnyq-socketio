FROM node:22.1.0
WORKDIR /app
COPY . /app
RUN npm install
EXPOSE 3001
RUN npx tsc
CMD node dist/index.js