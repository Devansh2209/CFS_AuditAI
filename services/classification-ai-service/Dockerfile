FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY classification-ai-service ./services/classification-ai-service

# Install dependencies
WORKDIR /app/services/classification-ai-service
RUN npm install

# Start
CMD ["npm", "start"]
