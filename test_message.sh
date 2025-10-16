#!/bin/bash
# Message Delivery Test Script

echo "🧪 Testing Message Delivery (Sender & Receiver)..."
echo "=================================================="

# Test 1: Health Check
echo ""
echo "📡 Step 1: Checking server status..."
curl -s http://localhost:5000/ | jq .

echo ""
echo "💬 Step 2: Testing message delivery..."

# Test message data
CONVERSATION_ID="68df8299e877336de0e33e18_68e3a2e15ab6d1e5e86e3edb"
SENDER_ID="68e3a2e15ab6d1e5e86e3edb"
RECEIVER_ID="68df8299e877336de0e33e18"
MESSAGE="Test message from $(date)"

echo "📨 Sending test message..."
echo "   Conversation: $CONVERSATION_ID"
echo "   Sender: $SENDER_ID"
echo "   Receiver: $RECEIVER_ID"
echo "   Message: $MESSAGE"

# Send test message
curl -X POST http://localhost:5000/api/test-message \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"$MESSAGE\",
    \"conversationId\": \"$CONVERSATION_ID\",
    \"senderId\": \"$SENDER_ID\",
    \"recipientId\": \"$RECEIVER_ID\"
  }" | jq .

echo ""
echo "✅ Test completed!"
echo ""
echo "🔍 What to check:"
echo "   1. Server logs should show '✅ Message saved to MongoDB'"
echo "   2. Browser should receive real-time message"
echo "   3. Page refresh should show message in history"
echo ""
echo "🚨 If still not working:"
echo "   - Check MongoDB Atlas Network Access (add 0.0.0.0/0)"
echo "   - Verify cluster is running in Atlas dashboard"
echo "   - Check server logs for connection errors"
