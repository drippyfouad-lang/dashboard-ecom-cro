import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ContactMessage from '@/lib/models/ContactMessage';

// GET /api/contact_messages - List contact messages with pagination
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const read = searchParams.get('read') || '';

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (read === 'true') {
      query.read = true;
    } else if (read === 'false') {
      query.read = false;
    }

    const skip = (page - 1) * limit;

    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ContactMessage.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/contact_messages error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/contact_messages - Create new contact message (for frontend form)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, email, phone, title, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const contactMessage = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      title: title?.trim() || '',
      message: message.trim(),
      status: 'new',
      read: false,
    });

    return NextResponse.json({
      success: true,
      data: contactMessage,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('POST /api/contact_messages error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/contact_messages?ids=id1,id2,id3 - Delete multiple messages
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: 'Message IDs are required' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',');

    const result = await ContactMessage.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} message(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('DELETE /api/contact_messages error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
