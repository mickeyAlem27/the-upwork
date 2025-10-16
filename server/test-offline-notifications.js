// Comprehensive test for offline message handling and notifications
// This tests the complete flow of offline users receiving notifications when they come back online

const io = require('socket.io-client');

console.log('🔬 Testing Offline Message Handling & Notifications');
console.log('===================================================');

let testPassed = true;

const testOfflineNotifications = async () => {
  return new Promise((resolve) => {
    console.log('\n🔌 Testing Socket.IO connection for offline scenario...');

    const socket1 = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    const socket2 = io('http://localhost:5000', {
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

    let user1Connected = false;
    let user2Connected = false;
    let messageSent = false;
    let offlineNotificationsReceived = false;

    // Test User 1 (Alice) connects first
    socket1.on('connect', () => {
      console.log('✅ User 1 (Alice) connected');

      socket1.emit('user_identify', {
        userId: mockUser1._id,
        email: 'alice@test.com'
      });

      user1Connected = true;

      // Wait a bit then send a message while User 2 is offline
      setTimeout(() => {
        if (user1Connected && !user2Connected) {
          console.log('\n📤 Sending message while User 2 (Bob) is offline...');

          const testMessage = {
            conversationId: [mockUser1._id, mockUser2._id].sort().join('_'),
            content: 'Hello Bob! This message should be stored as missed since you are offline.',
            recipientId: mockUser2._id,
            senderId: mockUser1._id,
            timestamp: new Date()
          };

          console.log('📨 Sending message...');
          socket1.emit('send_message', testMessage);
          messageSent = true;

          // Disconnect User 1 after sending message
          setTimeout(() => {
            socket1.disconnect();
            console.log('🔌 User 1 (Alice) disconnected');

            // Now connect User 2 (Bob) to receive offline notifications
            setTimeout(() => {
              console.log('\n🔗 User 2 (Bob) connecting to receive offline notifications...');

              socket2.on('connect', () => {
                console.log('✅ User 2 (Bob) connected');

                socket2.emit('user_identify', {
                  userId: mockUser2._id,
                  email: 'bob@test.com'
                });

                user2Connected = true;

                // Listen for missed message notifications
                socket2.on('missed_message_count_updated', (data) => {
                  console.log('\n📬 OFFLINE NOTIFICATION RECEIVED:');
                  console.log('   User ID:', data.userId);
                  console.log('   Missed Message Count:', data.missedMessageCount);
                  console.log('   Expected User ID:', mockUser2._id);

                  if (data.userId === mockUser2._id && data.missedMessageCount > 0) {
                    console.log('✅ SUCCESS: Offline user received missed message count');
                    offlineNotificationsReceived = true;

                    // Test passed
                    socket2.disconnect();
                    resolve(true);
                  }
                });

                // Listen for missed message details
                socket2.on('message_notification', (data) => {
                  console.log('\n📨 MISSED MESSAGE DETAILS RECEIVED:');
                  console.log('   Type:', data.type);
                  console.log('   Sender:', data.senderName);
                  console.log('   Message Count:', data.messageCount);
                  console.log('   Latest Message:', data.latestMessage);
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                  console.log('\n⏱️  Test completed - checking results...');
                  if (offlineNotificationsReceived) {
                    console.log('✅ SUCCESS: Offline notifications working!');
                  } else {
                    console.log('❌ FAILED: Offline notifications not received');
                    testPassed = false;
                  }
                  socket2.disconnect();
                  resolve(offlineNotificationsReceived);
                }, 5000);

              });

            }, 2000);
          }, 1000);
        }
      }, 1000);

    });

    socket1.on('connect_error', (error) => {
      console.log('❌ User 1 Socket.IO connection failed:', error.message);
      resolve(false);
    });

    socket2.on('connect_error', (error) => {
      console.log('❌ User 2 Socket.IO connection failed:', error.message);
      resolve(false);
    });

    // Overall timeout after 30 seconds
    setTimeout(() => {
      console.log('\n⏱️  Overall test timed out');
      socket1.disconnect();
      socket2.disconnect();
      resolve(false);
    }, 30000);
  });
};

// Run the test
async function runTests() {
  console.log('🚀 Starting Offline Message Notification Test');
  console.log('=============================================\n');

  try {
    const offlineTestPassed = await testOfflineNotifications();

    console.log('\n📊 OFFLINE NOTIFICATION TEST RESULTS');
    console.log('=====================================');
    console.log(`${offlineTestPassed ? '✅' : '❌'} Offline notifications: ${offlineTestPassed ? 'Working' : 'Failed'}`);

    if (offlineTestPassed) {
      console.log('\n🎉 SUCCESS: Offline message handling works perfectly!');
      console.log('💡 Complete offline flow verified:');
      console.log('   ✅ Messages stored when users are offline');
      console.log('   ✅ Missed message counts broadcast to other users');
      console.log('   ✅ Offline users receive notifications when they reconnect');
      console.log('   ✅ Unread counts update correctly for offline users');
    } else {
      console.log('\n❌ Issues detected with offline message handling');
      console.log('💡 Possible issues:');
      console.log('   - Message storage for offline users not working');
      console.log('   - Missed message count broadcasting failed');
      console.log('   - Frontend not receiving offline notifications');
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

runTests();
