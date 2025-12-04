FROM node:18-alpine
WORKDIR /app

# Copy shared libraries
COPY shared ./shared

# Copy service code
COPY nlp-processing-service ./services/nlp-processing-service

# Install dependencies
WORKDIR /app/services/nlp-processing-service
RUN npm install

# Start
CMD ["npm", "start"]
