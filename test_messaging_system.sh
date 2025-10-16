#!/bin/bash
# Complete Messaging System Test

echo "🧪 COMPREHENSIVE MESSAGING SYSTEM TEST"
echo "======================================"

echo ""
echo "📡 Step 1: Server Status Check"
echo "------------------------------"
curl -s http://localhost:5000/ | jq . 2>/dev/null || echo "❌ Backend server not responding"

echo ""
echo "🌐 Step 2: Frontend Status Check"
echo "--------------------------------"
curl -s http://localhost:5173/ | head -3 | grep -q "vite" && echo "✅ Frontend server running" || echo "❌ Frontend server not responding"

echo ""
echo "💾 Step 3: Database Connection Test"
echo "-----------------------------------"
curl -s http://localhost:5000/ | grep -o '"mongodb":"[^"]*"' || echo "❌ MongoDB status unknown"

echo ""
echo "📨 Step 4: Message API Test"
echo "---------------------------"
curl -X POST http://localhost:5000/api/test-message \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Test message from API",
    "conversationId":"test_conversation_123",
    "senderId":"user1",
    "recipientId":"user2"
  }' | jq . 2>/dev/null || echo "❌ Message API test failed"

echo ""
echo "🔧 Step 5: Socket.IO Test"
echo "-------------------------"
echo "Open your browser and test:"
echo "1. Go to: http://localhost:5173/"
echo "2. Login with two different users"
echo "3. Send a message between them"
echo "4. Check browser console for Socket.IO events"
echo "5. Check server logs for '✅ Message saved to MongoDB'"

echo ""
echo "🎯 Expected Results:"
echo "- ✅ Real-time messaging works instantly"
echo "- ✅ Messages save to MongoDB"
echo "- ✅ Messages reload on page refresh"
echo "- ✅ Server logs show successful saves"

echo ""
echo "🚨 If Still Not Working:"
echo "1. Check MongoDB Atlas Network Access (0.0.0.0/0)"
echo "2. Verify cluster is running in Atlas dashboard"
echo "3. Check server logs for specific errors"
echo "4. Restart both servers if needed"
