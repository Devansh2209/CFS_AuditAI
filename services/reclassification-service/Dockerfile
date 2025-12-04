FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY reclassification-service ./services/reclassification-service

# Install dependencies
WORKDIR /app/services/reclassification-service
RUN npm install

# Start
CMD ["npm", "start"]
