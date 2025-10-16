# 🚨 Messaging System Troubleshooting

## Current Issues:
- Messages not saving to MongoDB
- Real-time messaging not working
- Socket.IO connection problems

## Step 1: Check Server Status
```bash
curl -s http://localhost:5000/
```
Expected: Server running, Socket.IO active

## Step 2: Check MongoDB Connection
The main issue is likely MongoDB Atlas connection.

### Fix MongoDB Atlas:
1. **Go to**: https://cloud.mongodb.com
2. **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow All)
3. **Clusters** → Verify cluster is **"Running"** (green dot)
4. **Database Access** → Verify user credentials

## Step 3: Check .env Configuration
Ensure your `.env` file has correct MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/PROMOTION?retryWrites=true&w=majority
```

## Step 4: Restart Everything
1. **Kill server**: `taskkill /f /im node.exe`
2. **Restart server**: `cd server && node server.js`
3. **Restart frontend**: `npm run dev`

## Step 5: Test Messaging
1. Open two browser tabs with different users
2. Send message from User A to User B
3. Check server logs for: "✅ Message saved to MongoDB"
4. Check if message appears in both browsers instantly
5. Refresh page - messages should reload

## Alternative: Use Local MongoDB
If Atlas keeps failing, install MongoDB locally:
```bash
# Install MongoDB Community Edition
# Update .env:
MONGODB_URI=mongodb://localhost:27017/PROMOTION
```

## Debug Commands:
```bash
# Check server status
curl -s http://localhost:5000/

# Check MongoDB connection
curl -s http://localhost:5000/ | findstr mongodb

# Kill and restart server
taskkill /f /im node.exe
cd server && node server.js
```

The issue is most likely MongoDB Atlas IP restrictions. Follow the Atlas setup steps above!
