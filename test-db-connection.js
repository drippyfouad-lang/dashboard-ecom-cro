const mongoose = require('mongoose');
const fs = require('fs');

// Read .env.local file manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
let MONGODB_URI = '';

for (const line of lines) {
  if (line.startsWith('MONGODB_URI=')) {
    MONGODB_URI = line.substring('MONGODB_URI='.length).trim();
    break;
  }
}

console.log('Testing MongoDB Connection...');
console.log('MongoDB URI:', MONGODB_URI ? `${MONGODB_URI.substring(0, 30)}...` : 'NOT SET');

async function testConnection() {
  try {
    console.log('\n🔄 Attempting to connect to MongoDB...\n');
    
    // Try with directConnection option for better error messages
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    });

    console.log('✅ MongoDB Connected Successfully!\n');

    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Available Collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Count documents in main collections
    console.log('\n📊 Document Counts:');
    const db = mongoose.connection.db;
    
    const collectionNames = ['users', 'products', 'categories', 'orders', 'orderitems', 'wilayas', 'communes'];
    
    for (const name of collectionNames) {
      try {
        const count = await db.collection(name).countDocuments();
        console.log(`   ${name}: ${count} documents`);
      } catch (err) {
        console.log(`   ${name}: Collection not found`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    
    process.exit(1);
  }
}

testConnection();
