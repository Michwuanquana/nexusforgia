FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create feedback directory
RUN mkdir -p /app/feedback

EXPOSE 3001

CMD ["node", "server.js"]
