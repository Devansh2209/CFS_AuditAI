FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
# Copy shared libraries
COPY shared ./shared
RUN cd shared/common-utils && npm install

# Copy service code
COPY security-auth-service ./services/security-auth-service

# Install dependencies
WORKDIR /app/services/security-auth-service
RUN npm install

# Start
CMD ["npm", "start"]
