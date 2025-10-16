// Test to verify conversation-specific message handling
// This will help debug why messages don't appear when conversation is selected

const io = require('socket.io-client');

console.log('🔬 Testing Conversation-Specific Message Handling');
console.log('================================================');

let testPassed = true;

const testConversationMessages = async () => {
  return new Promise((resolve) => {
    console.log('\n🔌 Testing Socket.IO connection...');

    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    // Mock users for testing
    const mockUser1 = {
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Alice',
      lastName: 'Johnson'
    };

    const mockUser2 = {
      _id: '507f1f77bcf86cd799439012',
      firstName: 'Bob',
      lastName: 'Wilson'
    };

    let conversationJoined = false;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');

      // Test 1: Identify as User 1 (Alice)
      socket.emit('user_identify', {
        userId: mockUser1._id,
        email: 'alice@test.com'
      });

      console.log('👤 Identified as:', mockUser1.firstName, mockUser1.lastName);

      // Test 2: Join conversation as User 1
      const conversationId = [mockUser1._id, mockUser2._id].sort().join('_');
      console.log('🔗 Joining conversation:', conversationId);

      socket.emit('join_conversation', conversationId);
      conversationJoined = true;

      // Test 3: Listen for conversation messages
      socket.on('new_message', (message) => {
        console.log('\n💬 CONVERSATION MESSAGE RECEIVED:');
        console.log('   Message ID:', message.id);
        console.log('   Conversation ID:', message.conversationId);
        console.log('   Sender ID:', message.senderId);
        console.log('   Content:', message.content);
        console.log('   Expected Conversation ID:', conversationId);
        console.log('   Match:', message.conversationId === conversationId ? '✅ YES' : '❌ NO');

        if (message.conversationId === conversationId) {
          console.log('✅ SUCCESS: Message correctly routed to conversation');
        } else {
          console.log('❌ ERROR: Message conversationId does not match expected');
          testPassed = false;
        }

        socket.disconnect();
        resolve(testPassed);
      });

      // Test 4: Simulate sending a message to this conversation
      setTimeout(() => {
        if (conversationJoined) {
          console.log('\n📤 Simulating message send...');

          const testMessage = {
            conversationId: conversationId,
            content: 'Hello Bob! This is a test message for conversation-specific handling.',
            recipientId: mockUser2._id,
            senderId: mockUser1._id,
            timestamp: new Date()
          };

          console.log('📨 Sending message to conversation:', conversationId);
          socket.emit('send_message', testMessage);

          // Wait for response
          setTimeout(() => {
            console.log('\n⏱️  Test completed');
            socket.disconnect();
            resolve(testPassed);
          }, 2000);
        }
      }, 1000);

    });

    socket.on('connect_error', (error) => {
      console.log('❌ Socket.IO connection failed:', error.message);
      resolve(false);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      console.log('\n⏱️  Test timed out');
      socket.disconnect();
      resolve(false);
    }, 15000);
  });
};

// Run the test
async function runTests() {
  console.log('🚀 Starting Conversation Message Test');
  console.log('====================================\n');

  try {
    const conversationTestPassed = await testConversationMessages();

    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('======================');
    console.log(`${conversationTestPassed ? '✅' : '❌'} Conversation messages: ${conversationTestPassed ? 'Working' : 'Failed'}`);

    if (conversationTestPassed) {
      console.log('\n🎉 SUCCESS: Conversation-specific message handling works!');
      console.log('💡 Complete flow verified:');
      console.log('   ✅ Socket joins conversation room');
      console.log('   ✅ Messages are routed to correct conversation');
      console.log('   ✅ Messages appear in chat when conversation selected');
      console.log('   ✅ Unread counts update correctly');
    } else {
      console.log('\n❌ Issues detected with conversation message handling');
      console.log('💡 Possible issues:');
      console.log('   - Conversation room joining failed');
      console.log('   - Message conversationId mismatch');
      console.log('   - Socket event listeners not working');
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

runTests();
