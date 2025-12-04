FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY client-configuration-service ./services/client-configuration-service

# Install dependencies
WORKDIR /app/services/client-configuration-service
RUN npm install

# Start
CMD ["npm", "start"]
