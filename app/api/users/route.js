import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

// GET /api/users - List users with pagination and filters
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role && role !== 'All') {
      query.role = role.toLowerCase();
    }
    
    if (status && status !== 'All') {
      query.active = status === 'Active';
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { full_name, email, phone, role, password, active } = body;

    // Validate required fields
    if (!full_name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      full_name,
      email: email.toLowerCase(),
      phone: phone || '',
      role: role || 'customer',
      password: hashedPassword,
      active: active !== undefined ? active : true,
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return NextResponse.json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
