import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await Message.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean();
    const total = await Message.countDocuments(filter);

    return NextResponse.json({ success: true, message: 'Messages fetched', data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Failed to fetch messages', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request) {
  // Allow external sites to post messages without auth - validate payload
  try {
    await dbConnect();
    const body = await request.json();
    const { full_name, email, phone, title, body: messageBody, source } = body;

    if (!full_name || !email || !messageBody) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const msg = await Message.create({ full_name, email, phone, title, body: messageBody, source: source || 'external' });
    return NextResponse.json({ success: true, message: 'Message saved', data: msg });
  } catch (err) {
    console.error('Failed to save message', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to save message' }, { status: 500 });
  }
}
