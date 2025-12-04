FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY data-ingestion-service ./services/data-ingestion-service

# Install dependencies
WORKDIR /app/services/data-ingestion-service
RUN npm install

# Start
CMD ["npm", "start"]
