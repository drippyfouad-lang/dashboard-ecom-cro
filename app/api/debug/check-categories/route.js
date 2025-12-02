import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find({}).sort({ created_at: -1 });

    // Check for duplicates
    const ids = categories.map(c => c._id.toString());
    const uniqueIds = new Set(ids);
    
    const hasDuplicates = ids.length !== uniqueIds.size;
    
    let duplicates = [];
    if (hasDuplicates) {
      const seen = {};
      ids.forEach((id, idx) => {
        if (seen[id]) {
          duplicates.push({
            id,
            first: { index: seen[id], name: categories[seen[id]].name },
            second: { index: idx, name: categories[idx].name }
          });
        } else {
          seen[id] = idx;
        }
      });
    }

    return NextResponse.json({
      success: true,
      total: categories.length,
      uniqueIds: uniqueIds.size,
      hasDuplicates,
      duplicates,
      categories: categories.map((c, idx) => ({
        index: idx,
        id: c._id.toString(),
        name: c.name,
        created_at: c.created_at
      }))
    });
  } catch (error) {
    console.error('Error checking categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
