FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY workflow-orchestration-service ./services/workflow-orchestration-service

# Install dependencies
WORKDIR /app/services/workflow-orchestration-service
RUN npm install

# Start
CMD ["npm", "start"]
