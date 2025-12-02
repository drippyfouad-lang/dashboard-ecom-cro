import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Connect to database
    await connectDB();

    // Check if admin user exists
    let admin = await User.findOne({ email: process.env.ADMIN_EMAIL });

    // Create admin user if doesn't exist
    if (!admin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      admin = await User.create({
        full_name: 'Admin User',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        active: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully',
      admin: {
        email: admin.email,
        role: admin.role,
        active: admin.active,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
