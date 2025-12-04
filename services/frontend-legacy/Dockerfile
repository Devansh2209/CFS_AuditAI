FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Configure npm for better reliability during Docker builds
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
