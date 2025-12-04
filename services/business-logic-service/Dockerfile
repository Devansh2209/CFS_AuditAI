FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY business-logic-service ./services/business-logic-service

# Install dependencies
WORKDIR /app/services/business-logic-service
RUN npm install

# Start
CMD ["npm", "start"]
