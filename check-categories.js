// Script to check for duplicate category IDs
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkCategories() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in .env.local');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const cats = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log('\n📊 Total categories:', cats.length);

    if (cats.length === 0) {
      console.log('⚠️  No categories found in database');
      await mongoose.disconnect();
      return;
    }

    // Check for duplicate IDs
    const ids = cats.map(c => c._id.toString());
    const uniqueIds = new Set(ids);
    
    console.log('🔑 Unique IDs:', uniqueIds.size);

    if (ids.length !== uniqueIds.size) {
      console.log('\n🚨 DUPLICATE IDs FOUND!');
      const seen = {};
      ids.forEach((id, idx) => {
        if (seen[id]) {
          console.log(`❌ Duplicate ID: ${id}`);
          console.log(`   - First occurrence: index ${seen[id]}, name: ${cats[seen[id]].name}`);
          console.log(`   - Second occurrence: index ${idx}, name: ${cats[idx].name}`);
        } else {
          seen[id] = idx;
        }
      });
    } else {
      console.log('✅ All IDs are unique');
    }

    // Print all categories with their IDs
    console.log('\n📋 All Categories:');
    cats.forEach((cat, idx) => {
      console.log(`${idx + 1}. ID: ${cat._id.toString().substring(0, 8)}... | Name: ${cat.name}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCategories();
