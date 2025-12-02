import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';

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
    const period = parseInt(searchParams.get('period') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get statistics
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      pendingOrders,
    ] = await Promise.all([
      Order.countDocuments({
        created_at: { $gte: startDate, $lte: endDate },
      }),
      Order.aggregate([
        {
          $match: {
            created_at: { $gte: startDate, $lte: endDate },
            status: { $nin: ['Cancelled', 'Returned'] }, // Exclude cancelled and returned orders
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]),
      Order.distinct('customer_name').then(customers => customers.length),
      Product.countDocuments({ in_stock: true }),
      Order.countDocuments({ status: 'Pending' }),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;

    // Calculate growth (placeholder - would need historical data for real calculation)
    const revenueGrowth = 0;
    const ordersGrowth = 0;

    // Compute top products by revenue from paid orders
    let topProducts = [];
    try {
      const paidOrders = await Order.find({ payment_status: 'Paid' }).select('_id').lean();
      const paidOrderIds = paidOrders.map(o => o._id);

      if (paidOrderIds.length > 0) {
        const agg = await OrderItem.aggregate([
          { $match: { order_id: { $in: paidOrderIds } } },
          {
            $group: {
              _id: { product_id: '$product_id', product_name: '$product_name' },
              totalRevenue: { $sum: { $multiply: ['$unit_price', '$quantity'] } },
              totalQuantity: { $sum: '$quantity' },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 7 },
        ]).exec();

        topProducts = agg.map(item => ({
          product_id: item._id.product_id,
          product_name: item._id.product_name,
          total_revenue: item.totalRevenue,
          total_quantity: item.totalQuantity,
        }));
      }
    } catch (err) {
      console.error('Failed to compute top products:', err);
      topProducts = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        total_revenue: revenue,
        total_orders: totalOrders,
        total_customers: totalCustomers,
        avg_order_value: avgOrderValue,
        total_products: totalProducts,
        pending_orders: pendingOrders,
        top_products: topProducts,
        revenue_growth: revenueGrowth,
        orders_growth: ordersGrowth,
      },
    });
  } catch (error) {
    console.error('Finance summary error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
