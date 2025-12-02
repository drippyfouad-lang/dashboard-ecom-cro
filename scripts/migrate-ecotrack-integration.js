/**
 * Migration Script: EcoTrack Integration
 * 
 * This script updates existing orders to use the new schema
 * Run with: node scripts/migrate-ecotrack-integration.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    const value = valueParts.join('=').trim();
    process.env[key.trim()] = value;
  }
});

async function migrateOrders() {
  try {
    console.log('🔄 Starting EcoTrack Integration Migration...\n');
    
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');

    // Backup existing orders
    console.log('💾 Creating backup of existing orders...');
    const allOrders = await ordersCollection.find({}).toArray();
    const backupPath = path.join(__dirname, `orders-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(allOrders, null, 2));
    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`   Total orders backed up: ${allOrders.length}\n`);

    // Map old statuses to new statuses
    console.log('🔄 Mapping order statuses to new schema...');
    const statusMap = {
      'Pending': 'pending',
      'Confirmed': 'confirmed',
      'Processing': 'confirmed',
      'Shipped': 'shipped',
      'Out for Delivery': 'out-for-delivery',
      'Delivered': 'delivered',
      'Cancelled': 'cancelled',
      'Failed Delivery': 'out-for-delivery',
      'Returned': 'returned',
    };

    let updatedCount = 0;
    let errorCount = 0;

    for (const order of allOrders) {
      try {
        const updates = {};
        
        // Map status
        if (order.status && statusMap[order.status]) {
          updates.status = statusMap[order.status];
        }

        // Add default values for new fields
        if (!order.delivery_type) {
          updates.delivery_type = 'home';
        }
        
        if (!order.weight) {
          updates.weight = 1;
        }

        // Generate order number if missing
        if (!order.order_number) {
          const date = new Date(order.created_at || order.createdAt || Date.now());
          const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
          const random = Math.floor(10000 + Math.random() * 90000);
          updates.order_number = `ORD-${dateStr}-${random}`;
        }

        // Set confirmed_at for confirmed orders
        if (updates.status === 'confirmed' && !order.confirmed_at) {
          updates.confirmed_at = order.updated_at || order.updatedAt || new Date();
        }

        // Update the order
        if (Object.keys(updates).length > 0) {
          await ordersCollection.updateOne(
            { _id: order._id },
            { $set: updates }
          );
          updatedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error updating order ${order._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`   Orders updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}\n`);

    // Create indexes
    console.log('🔧 Creating new indexes...');
    await ordersCollection.createIndex({ ecotrack_order_id: 1 }, { sparse: true });
    await ordersCollection.createIndex({ ecotrack_tracking_number: 1 }, { sparse: true });
    await ordersCollection.createIndex({ customer_phone: 1 });
    await ordersCollection.createIndex({ order_number: 1 }, { unique: true, sparse: true });
    await ordersCollection.createIndex({ expedition_date: 1 });
    await ordersCollection.createIndex({ cancelled_at: 1 });
    await ordersCollection.createIndex({ status: 1, created_at: -1 });
    console.log('✅ Indexes created\n');

    // Show final statistics
    console.log('📊 Final Statistics:');
    const statuses = await ordersCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('   Status distribution:');
    statuses.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log(`📁 Backup file: ${backupPath}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateOrders();
