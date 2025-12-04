FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
# Copy shared libraries
COPY shared ./shared
RUN cd shared/common-utils && npm install

# Copy service code
COPY accounting-standards-service ./services/accounting-standards-service

# Install dependencies
WORKDIR /app/services/accounting-standards-service
RUN npm install

# Start
CMD ["npm", "start"]
