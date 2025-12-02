import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Social from '@/lib/models/Social';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const socials = await Social.find().sort({ created_at: -1 }).lean();
    return NextResponse.json({ success: true, message: 'Social accounts fetched', data: socials });
  } catch (err) {
    console.error('Failed to fetch socials', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch socials' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { instagram, facebook, tiktok, whatsapp, email, label } = body;

    const social = await Social.create({ instagram, facebook, tiktok, whatsapp, email, label: label || 'default' });
    return NextResponse.json({ success: true, message: 'Social saved', data: social });
  } catch (err) {
    console.error('Failed to save social', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to save social' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { id, instagram, facebook, tiktok, whatsapp, email, label } = body;
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    const updated = await Social.findByIdAndUpdate(id, { instagram, facebook, tiktok, whatsapp, email, label }, { new: true });
    return NextResponse.json({ success: true, message: 'Social updated', data: updated });
  } catch (err) {
    console.error('Failed to update social', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to update social' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    await Social.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Social deleted' });
  } catch (err) {
    console.error('Failed to delete social', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to delete social' }, { status: 500 });
  }
}
