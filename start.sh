#!/bin/bash

# ============================================
# AI Brand Voice Consistency Checker - Startup
# ============================================

set -e

echo ""
echo "============================================"
echo "  AI Brand Voice Consistency Checker"
echo "  Enterprise SaaS Platform"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Kill processes on ports 3000 and 3001
echo -e "${YELLOW}[1/6] Cleaning up ports...${NC}"
kill_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pids" ]; then
    echo -e "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  Port $port is available"
  fi
}

kill_port 3000
kill_port 3001

# Check PostgreSQL
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}PostgreSQL is running${NC}"
  else
    echo -e "  ${RED}PostgreSQL is not running. Starting...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo -e "  ${YELLOW}pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if not exists
echo -e "${YELLOW}[3/6] Setting up database...${NC}"
createdb brand_voice_checker 2>/dev/null && echo -e "  ${GREEN}Database created${NC}" || echo -e "  Database already exists"

# Install dependencies
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"
npm install --silent 2>&1 | tail -1
cd client && npm install --silent 2>&1 | tail -1
cd ..

# Seed database
echo -e "${YELLOW}[5/6] Seeding database with sample data...${NC}"
node server/seed.js

# Start application with hot reload
echo -e "${YELLOW}[6/6] Starting application...${NC}"
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Application Starting!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  ${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "  ${BLUE}Backend:${NC}  http://localhost:3001"
echo -e "  ${BLUE}API Health:${NC} http://localhost:3001/api/health"
echo ""
echo -e "  ${YELLOW}Login Credentials:${NC}"
echo -e "  Email:    admin@brandvoice.com"
echo -e "  Password: password123"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Start with hot reload (nodemon for backend, vite for frontend)
npx concurrently \
  --names "SERVER,CLIENT" \
  --prefix-colors "blue,green" \
  "npx nodemon --watch server server/index.js" \
  "cd client && npx vite --port 3000"
