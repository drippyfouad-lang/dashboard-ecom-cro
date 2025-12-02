import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { createOrders } from '@/lib/ecotrackService';

/**
 * POST /api/orders/anderson/send-to-ecotrack
 * Send multiple orders to EcoTrack API
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'moderator'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order IDs are required' },
        { status: 400 }
      );
    }

    // Limit to 100 orders per request (EcoTrack limit)
    if (orderIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 orders per request' },
        { status: 400 }
      );
    }

    // Fetch orders with populated data
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('wilaya_id', 'name code')
      .populate('commune_id', 'name')
      .lean();

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No orders found' },
        { status: 404 }
      );
    }

    // Transform orders to EcoTrack format
    const ecotrackOrders = orders.map((order) => ({
      reference: order.order_number || order._id.toString(),
      nom_client: order.customer_name,
      telephone: order.customer_phone,
      telephone_2: order.customer_phone_2 || '',
      adresse: order.shipping_address,
      code_postal: order.postal_code || '',
      commune: order.commune_id?.name || order.commune || '',
      code_wilaya: order.wilaya_id?.code || order.wilaya_code || '',
      montant: Math.round(order.total || 0),
      remarque: order.notes || '',
      produit: order.items?.map(item => item.product_name).join(', ') || '',
      stock: 0, // Not using stock system
      quantite: '',
      produit_a_recuperer: '',
      boutique: '',
      type: 1, // 1 = Livraison
      stop_desk: order.delivery_type === 'desk' ? 1 : 0,
      weight: order.weight || 1,
      fragile: 0,
      gps_link: order.gps_link || '',
    }));

    // Send to EcoTrack
    const result = await createOrders(ecotrackOrders);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send orders to EcoTrack',
          details: result.error,
        },
        { status: 500 }
      );
    }

    // Process results and update orders
    // ECOTRACK API response format: { "results": { "reference": { "success": true, "tracking": "..." } or { "error": [...] } } }
    const results = result.data.results || {};
    const successfulOrders = [];
    const failedOrders = [];

    for (const [reference, orderResult] of Object.entries(results)) {
      const order = orders.find(
        (o) => {
          const orderRef = o.order_number || o._id.toString();
          return orderRef === reference;
        }
      );

      if (!order) {
        console.warn(`[EcoTrack] Order not found for reference: ${reference}`);
        continue;
      }

      // Check if order was successful (has tracking number)
      if (orderResult.success && orderResult.tracking) {
        // Update order with EcoTrack tracking number
        await Order.findByIdAndUpdate(order._id, {
          ecotrack_tracking_number: orderResult.tracking,
          ecotrack_order_id: orderResult.tracking,
          status: 'sent',
          expedition_date: new Date(),
          ecotrack_status: 'pending',
        });

        successfulOrders.push({
          orderId: order._id,
          orderNumber: reference,
          tracking: orderResult.tracking,
        });
      } else {
        // Order failed - extract error messages
        const errorMessages = [];
        if (typeof orderResult === 'object') {
          Object.entries(orderResult).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          });
        } else {
          errorMessages.push(String(orderResult));
        }

        failedOrders.push({
          orderId: order._id,
          orderNumber: reference,
          errors: errorMessages,
          rawError: orderResult,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successfulOrders.length} orders sent successfully`,
      data: {
        successful: successfulOrders,
        failed: failedOrders,
        total: orders.length,
      },
    });
  } catch (error) {
    console.error('[API] Error sending orders to EcoTrack:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
