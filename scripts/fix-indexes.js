/**
 * Script to fix MongoDB indexes
 * Run with: node scripts/fix-indexes.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    const value = valueParts.join('=').trim();
    process.env[key.trim()] = value;
  }
});

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    // Get all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key, idx.unique ? '(UNIQUE)' : '');
    });

    // Find and drop the problematic variants.sku_1 index
    const problematicIndex = indexes.find(idx => idx.name === 'variants.sku_1' && idx.unique === true);
    
    if (problematicIndex) {
      console.log('\n🔧 Dropping problematic unique index: variants.sku_1');
      await collection.dropIndex('variants.sku_1');
      console.log('✅ Successfully dropped unique index');
    } else {
      console.log('\nℹ️  No problematic unique index found (already fixed or never existed)');
    }

    // Create sparse index (allows multiple null values)
    try {
      console.log('\n🔧 Creating sparse index on variants.sku...');
      await collection.createIndex({ 'variants.sku': 1 }, { sparse: true, name: 'variants.sku_1_sparse' });
      console.log('✅ Successfully created sparse index');
    } catch (error) {
      if (error.code === 85 || error.message.includes('already exists')) {
        console.log('ℹ️  Sparse index already exists');
      } else {
        throw error;
      }
    }

    // Show final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key, idx.unique ? '(UNIQUE)' : '', idx.sparse ? '(SPARSE)' : '');
    });

    console.log('\n✅ Index fix complete! You can now create products.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixIndexes();
