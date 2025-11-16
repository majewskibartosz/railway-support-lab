#!/bin/bash

# Test script for Railway Support Lab
# Tests all major endpoints to verify deployment

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Use Railway URL if set, otherwise localhost
URL="${RAILWAY_STATIC_URL:-http://localhost:3000}"

echo "======================================================"
echo "Railway Support Lab - Endpoint Testing"
echo "======================================================"
echo "Testing URL: $URL"
echo ""

# Function to test endpoint
test_endpoint() {
  local method=$1
  local path=$2
  local description=$3
  local data=$4

  echo -n "Testing: $description ... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$URL$path")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$URL$path" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "PATCH" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PATCH "$URL$path" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ $http_code${NC}"
  elif [ "$http_code" -ge 400 ]; then
    echo -e "${RED}✗ $http_code${NC}"
  else
    echo -e "${YELLOW}? $http_code${NC}"
  fi
}

# Health Checks
echo "=== HEALTH ENDPOINTS ==="
test_endpoint "GET" "/health" "Basic health check"
test_endpoint "GET" "/health/full" "Full health check"
test_endpoint "GET" "/metrics" "Metrics endpoint"
echo ""

# Ticket Operations
echo "=== TICKET ENDPOINTS ==="
test_endpoint "GET" "/api/tickets" "List all tickets"
test_endpoint "GET" "/api/tickets?status=open" "Filter by status"
test_endpoint "GET" "/api/tickets?severity=high" "Filter by severity"
test_endpoint "GET" "/api/tickets/1" "Get ticket by ID"
test_endpoint "POST" "/api/tickets" "Create new ticket" '{"title":"Test ticket from script","severity":"low"}'
test_endpoint "PATCH" "/api/tickets/1" "Update ticket" '{"status":"in_progress"}'
test_endpoint "GET" "/api/tickets/stats" "Get ticket statistics"
echo ""

# Status/External API
echo "=== STATUS ENDPOINTS ==="
test_endpoint "GET" "/api/status" "Check external API status"
test_endpoint "GET" "/api/status/history" "Get API call history"
test_endpoint "GET" "/api/status/test/200" "Test 200 status code"
test_endpoint "POST" "/api/status/notify/1" "Send notification" '{"message":"Test notification"}'
echo ""

# Debug Endpoints (only if enabled)
echo "=== DEBUG ENDPOINTS ==="
test_endpoint "GET" "/debug/env" "Environment variables"
test_endpoint "GET" "/debug/db-test" "Database connection test"
echo ""

echo "======================================================"
echo "Testing complete!"
echo "======================================================"
echo ""
echo "To test slow/error endpoints manually:"
echo "  curl $URL/debug/slow-query"
echo "  curl $URL/debug/error"
echo "  curl $URL/debug/timeout?seconds=5"
echo ""
