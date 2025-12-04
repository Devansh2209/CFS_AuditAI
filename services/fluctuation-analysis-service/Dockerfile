FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY fluctuation-analysis-service ./services/fluctuation-analysis-service

# Install dependencies
WORKDIR /app/services/fluctuation-analysis-service
RUN npm install

# Start
CMD ["npm", "start"]
