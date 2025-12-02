import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ContactMessage from '@/lib/models/ContactMessage';

// GET /api/contact_messages/[id] - Get single contact message
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const message = await ContactMessage.findById(id);

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('GET /api/contact_messages/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/contact_messages/[id] - Update contact message (mark as read, change status)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { read, status } = body;

    const updateData = {};
    if (typeof read !== 'undefined') {
      updateData.read = read;
    }
    if (status) {
      updateData.status = status;
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: message,
      message: 'Message updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/contact_messages/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/contact_messages/[id] - Delete single contact message
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const message = await ContactMessage.findByIdAndDelete(id);

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
      data: message,
    });
  } catch (error) {
    console.error('DELETE /api/contact_messages/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
