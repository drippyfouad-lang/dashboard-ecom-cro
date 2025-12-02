import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';

/**
 * API endpoint to fix database indexes
 * This will drop the problematic unique index on variants.sku
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const collection = Product.collection;
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Find and drop the problematic variants.sku_1 index
    const problematicIndex = indexes.find(idx => idx.name === 'variants.sku_1' && idx.unique === true);
    
    if (problematicIndex) {
      console.log('Dropping problematic index:', problematicIndex.name);
      await collection.dropIndex('variants.sku_1');
      console.log('✅ Dropped unique index on variants.sku');
    } else {
      console.log('ℹ️ Problematic index not found or already dropped');
    }

    // Recreate as sparse index (non-unique)
    try {
      await collection.createIndex({ 'variants.sku': 1 }, { sparse: true });
      console.log('✅ Created sparse index on variants.sku');
    } catch (error) {
      if (error.code === 85) {
        // Index already exists with same specification
        console.log('ℹ️ Sparse index already exists');
      } else {
        throw error;
      }
    }

    // Get updated indexes
    const updatedIndexes = await collection.indexes();

    return NextResponse.json({
      success: true,
      message: 'Indexes fixed successfully',
      data: {
        before: indexes,
        after: updatedIndexes,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/fix-indexes error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
