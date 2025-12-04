FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY audit-compliance-service ./services/audit-compliance-service

# Install dependencies
WORKDIR /app/services/audit-compliance-service
RUN npm install

# Start
CMD ["npm", "start"]
