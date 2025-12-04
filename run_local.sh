#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AuditAI Local System Launcher   ${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to check if a port is in use and kill the process
check_port() {
    local port=$1
    local name=$2
    if lsof -ti:$port > /dev/null; then
        echo -e "${RED}Port $port ($name) is in use. Killing process...${NC}"
        lsof -ti:$port | xargs kill -9
        sleep 1
    fi
}

# 1. Cleanup Ports
echo -e "\n${BLUE}[1/4] Cleaning up ports...${NC}"
check_port 5001 "AI Service"
check_port 3000 "Gateway"
check_port 5173 "Frontend"

# 2. Start AI Service (FinBERT V31)
echo -e "\n${BLUE}[2/4] Starting AI Service (FinBERT V31)...${NC}"
cd services/classification-ai-service
if [ ! -d "venv" ] && [ ! -d "../../../v30_env" ]; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
fi
# Use the v30_env if active or available, else system python
nohup python3 src/bert_service.py > ../../ai_service.log 2>&1 &
AI_PID=$!
echo -e "${GREEN}AI Service started on port 5001 (PID: $AI_PID)${NC}"
cd ../..

# 3. Start Gateway
echo -e "\n${BLUE}[3/4] Starting Gateway...${NC}"
cd services/gateway
if [ ! -d "node_modules" ]; then
    echo "Installing Gateway dependencies..."
    npm install
fi
nohup npm run dev > ../../gateway.log 2>&1 &
GATEWAY_PID=$!
echo -e "${GREEN}Gateway started on port 3000 (PID: $GATEWAY_PID)${NC}"
cd ../..

# 4. Start Frontend
echo -e "\n${BLUE}[4/4] Starting Frontend...${NC}"
cd services/frontend
if [ ! -d "node_modules" ]; then
    echo "Installing Frontend dependencies..."
    npm install
fi
nohup npm run dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend started on port 5173 (PID: $FRONTEND_PID)${NC}"
cd ../..

echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}   SYSTEM STARTED SUCCESSFULLY!   ${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Frontend:  http://localhost:5173"
echo -e "Gateway:   http://localhost:3000"
echo -e "AI Service: http://localhost:5001"
echo -e "\nLogs are being written to:"
echo -e "- ai_service.log"
echo -e "- gateway.log"
echo -e "- frontend.log"
echo -e "\nTo stop everything, run: ${RED}lsof -ti:5001,3000,5173 | xargs kill -9${NC}"
