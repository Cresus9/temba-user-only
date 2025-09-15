#!/bin/bash

echo "🔍 Payment Production Diagnostic Tool"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production endpoints
PROD_SUPABASE_URL="https://uwmlagvsivxqocklxbbo.supabase.co"

echo -e "${BLUE}🌐 Testing Production Environment${NC}"
echo "=================================="

# Test 1: Check if Edge Functions are deployed
echo -e "\n${YELLOW}📝 Test 1: Edge Functions Availability${NC}"
echo "----------------------------------------"

echo "🔍 Testing verify-payment function..."
VERIFY_FUNCTION_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$PROD_SUPABASE_URL/functions/v1/verify-payment")

if [ "$VERIFY_FUNCTION_TEST" = "401" ]; then
  echo -e "${GREEN}✅ verify-payment function is deployed (401 = auth required)${NC}"
elif [ "$VERIFY_FUNCTION_TEST" = "404" ]; then
  echo -e "${RED}❌ verify-payment function NOT deployed${NC}"
else
  echo -e "${YELLOW}⚠️  verify-payment function status: $VERIFY_FUNCTION_TEST${NC}"
fi

echo "🔍 Testing create-payment function..."
CREATE_FUNCTION_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$PROD_SUPABASE_URL/functions/v1/create-payment")

if [ "$CREATE_FUNCTION_TEST" = "401" ]; then
  echo -e "${GREEN}✅ create-payment function is deployed (401 = auth required)${NC}"
elif [ "$CREATE_FUNCTION_TEST" = "404" ]; then
  echo -e "${RED}❌ create-payment function NOT deployed${NC}"
else
  echo -e "${YELLOW}⚠️  create-payment function status: $CREATE_FUNCTION_TEST${NC}"
fi

# Test 2: Check database connectivity
echo -e "\n${YELLOW}📝 Test 2: Database Connectivity${NC}"
echo "--------------------------------"

echo "🔍 Testing REST API endpoint..."
REST_API_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
  "$PROD_SUPABASE_URL/rest/v1/")

if [ "$REST_API_TEST" = "401" ]; then
  echo -e "${GREEN}✅ Database REST API accessible (401 = auth required)${NC}"
elif [ "$REST_API_TEST" = "404" ]; then
  echo -e "${RED}❌ Database REST API not found${NC}"
else
  echo -e "${YELLOW}⚠️  Database REST API status: $REST_API_TEST${NC}"
fi

# Test 3: Network/CORS issues
echo -e "\n${YELLOW}📝 Test 3: Network & CORS${NC}"
echo "-------------------------"

echo "🔍 Testing CORS headers..."
CORS_TEST=$(curl -s -I -X OPTIONS \
  -H "Origin: https://tembas.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "$PROD_SUPABASE_URL/functions/v1/verify-payment")

if echo "$CORS_TEST" | grep -q "access-control-allow-origin"; then
  echo -e "${GREEN}✅ CORS headers present${NC}"
else
  echo -e "${RED}❌ CORS headers missing${NC}"
fi

# Test 4: SSL/TLS
echo -e "\n${YELLOW}📝 Test 4: SSL/TLS Certificate${NC}"
echo "------------------------------"

echo "🔍 Testing SSL certificate..."
SSL_TEST=$(curl -s -I "$PROD_SUPABASE_URL" | head -1)
if echo "$SSL_TEST" | grep -q "200\|301\|302"; then
  echo -e "${GREEN}✅ SSL certificate valid${NC}"
else
  echo -e "${RED}❌ SSL certificate issue${NC}"
fi

# Test 5: Compare with working local environment
echo -e "\n${YELLOW}📝 Test 5: Environment Comparison${NC}"
echo "---------------------------------"

echo "🔍 Production URL: $PROD_SUPABASE_URL"
echo "🔍 Expected local URL: http://localhost:54321 (or similar)"
echo ""
echo "📋 Common Issues:"
echo "  • Environment variables not set in deployment"
echo "  • Edge functions not deployed to production"
echo "  • Database schema differences"
echo "  • JWT token expired/incorrect"
echo "  • Payment records only exist locally"

echo -e "\n${BLUE}🎯 Next Steps${NC}"
echo "=============="
echo "1. Check deployment platform environment variables"
echo "2. Verify Edge Functions are deployed"
echo "3. Test with correct production JWT token"
echo "4. Check if payment records exist in production database"
echo ""
echo "💡 Tip: The most common issue is environment variables"
echo "   not being set correctly in the deployment platform!"
