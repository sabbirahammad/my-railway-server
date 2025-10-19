import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import PaymentProof from "../models/paymentProofModel.js";

// 🟡 Get Delivery Cost based on location
const getDeliveryCost = async (shippingAddress) => {
  try {
    // TODO: Get these from admin settings in the future
    const defaultDhakaInside = 60; // Default cost for Dhaka Inside
    const defaultDhakaOutside = 120; // Default cost for Dhaka Outside

    // Check if city contains "Dhaka" to determine if it's inside Dhaka
    const isDhakaInside = shippingAddress?.city?.toLowerCase().includes('dhaka');

    return isDhakaInside ? defaultDhakaInside : defaultDhakaOutside;
  } catch (error) {
    console.error('Error calculating delivery cost:', error);
    return 60; // Default fallback
  }
};

// 🟡 Get Delivery Costs (Admin)
export const getDeliveryCosts = async (req, res) => {
  try {
    // TODO: In the future, store these in database
    const deliveryCosts = {
      dhakaInside: 60,
      dhakaOutside: 120
    };

    res.status(200).json({
      success: true,
      deliveryCosts
    });
  } catch (error) {
    console.error("Get delivery costs error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Update Delivery Costs (Admin)
export const updateDeliveryCosts = async (req, res) => {
  try {
    const { dhakaInside, dhakaOutside } = req.body;

    // Validate input
    if (dhakaInside === undefined || dhakaOutside === undefined) {
      return res.status(400).json({
        success: false,
        message: "Both dhakaInside and dhakaOutside costs are required",
      });
    }

    // TODO: In the future, save these to database
    const updatedCosts = {
      dhakaInside: parseFloat(dhakaInside),
      dhakaOutside: parseFloat(dhakaOutside)
    };

    res.status(200).json({
      success: true,
      message: "Delivery costs updated successfully",
      deliveryCosts: updatedCosts
    });
  } catch (error) {
    console.error("Update delivery costs error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟢 Create Order from Cart
export const createOrder = async (req, res) => {
  try {
    console.log('🚀 Order creation started for user:', req.user.id);
    const { shippingAddress, paymentMethod, notes } = req.body;
    console.log('📦 Order data received:', { shippingAddress, paymentMethod, notes });

    // Get user's cart
    let cart = await Cart.findOne({ userId: req.user.id });
    console.log('🛒 Cart found:', cart ? 'Yes' : 'No');

    // Create cart if it doesn't exist
    if (!cart) {
      return res.status(400).json({
        success: false,
        message: "Cart not found. Please add items to cart first.",
      });
    }

    // Populate product details
    console.log('🔄 Populating cart items...');
    await cart.populate("items.product_id");
    console.log('✅ Cart populated, items count:', cart.items?.length || 0);

    if (!cart.items || cart.items.length === 0) {
      console.log('❌ Cart is empty');
      return res.status(400).json({
        success: false,
        message: "Cart is empty. Please add items to cart first.",
      });
    }

    // Validate products are still available
    console.log('🔍 Validating products...');
    for (const item of cart.items) {
      const product = item.product_id;
      console.log('📦 Checking product:', item.name, 'Product ID:', product?._id);
      if (!product) {
        console.log('❌ Product not found:', item.name);
        return res.status(400).json({
          success: false,
          message: `Product ${item.name} is no longer available`,
        });
      }
    }
    console.log('✅ All products validated');

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Get delivery cost based on shipping address location
    const deliveryCost = await getDeliveryCost(shippingAddress);

    const total = subtotal + deliveryCost;

    // Generate order number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const orderNumber = `ORD-${year}${month}${day}-${random}`;

    // Create order
    const order = new Order({
      user: req.user.id,
      orderNumber,
      items: cart.items.map((item) => ({
        product_id: item.product_id._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        size: item.size,
      })),
      subtotal,
      deliveryCost,
      total,
      paymentMethod,
      shippingAddress,
      notes,
    });

    console.log('💾 Saving order with number:', orderNumber);
    await order.save();
    console.log('✅ Order saved successfully');

    // Clear cart after successful order
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Get All Orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("items.product_id")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Get Payment Proof for Order
export const getPaymentProof = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user owns the order or is admin
    if (!req.user || !req.user.id || (order.user.toString() !== req.user.id && req.user.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view payment proof for this order",
      });
    }

    const paymentProof = await PaymentProof.findOne({ order: orderId })
      .populate("verified_by", "name email")
      .select("-screenshot"); // Don't send screenshot in list view for security

    if (!paymentProof) {
      return res.status(404).json({
        success: false,
        message: "No payment proof found for this order",
      });
    }

    res.status(200).json({
      success: true,
      paymentProof,
    });
  } catch (error) {
    console.error("Get payment proof error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Get User's Orders
export const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user.id };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate({
        path: "items.product_id",
        select: "name images price" // Populate product name, images, and price
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟢 Submit Payment Proof
export const submitPaymentProof = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transaction_id, payment_method, amount, screenshot, sender_number, sender_name, payment_date } = req.body;

    console.log('💳 Payment proof submission for order:', orderId);

    // Validate required fields
    if (!transaction_id || !payment_method || !amount || !screenshot || !sender_number || !sender_name || !payment_date) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to submit payment proof for this order",
      });
    }

    // Check if order is in a valid status for payment proof
    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already verified for this order",
      });
    }

    // Check if payment proof already exists for this order
    const existingProof = await PaymentProof.findOne({ order: orderId });
    if (existingProof) {
      return res.status(400).json({
        success: false,
        message: "Payment proof already submitted for this order",
      });
    }

    // Create payment proof
    const paymentProof = new PaymentProof({
      order: orderId,
      user: req.user.id,
      transaction_id,
      payment_method,
      amount: parseFloat(amount),
      screenshot,
      sender_number,
      sender_name,
      payment_date: new Date(payment_date),
    });

    await paymentProof.save();

    // Update order payment status
    order.paymentStatus = "pending";
    await order.save();

    console.log('✅ Payment proof submitted successfully');

    res.status(201).json({
      success: true,
      message: "Payment proof submitted successfully",
      paymentProof: {
        id: paymentProof._id,
        transaction_id: paymentProof.transaction_id,
        payment_method: paymentProof.payment_method,
        amount: paymentProof.amount,
        status: paymentProof.status,
        submitted_at: paymentProof.submitted_at,
      },
    });
  } catch (error) {
    console.error("Submit payment proof error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔵 Get Order by ID (Admin or Owner)
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("items.product_id");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user owns the order or is admin
    if (!req.user || !req.user.id || !order.user || !order.user._id || (order.user._id.toString() !== req.user.id && req.user.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟠 Update Order Status (Admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    // Set delivery date if status is delivered
    if (status === "delivered") {
      order.deliveredDate = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Get Order Statistics (Admin)
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const processingOrders = await Order.countDocuments({
      status: "processing",
    });
    const shippedOrders = await Order.countDocuments({ status: "shipped" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });

    // Revenue stats
    const totalRevenue = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // Daily revenue for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          status: "delivered",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Payment method stats
    const paymentMethodStats = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        dailyRevenue,
        paymentMethodStats,
      },
    });
  } catch (error) {
    console.error("Get order stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔴 Cancel Order (Admin)
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel delivered order",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    order.status = "cancelled";
    order.cancelledDate = new Date();
    order.cancelReason = reason || "Cancelled by admin";

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟢 Verify Payment Proof (Admin)
export const verifyPaymentProof = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, adminNotes } = req.body;

    // Find payment proof
    const paymentProof = await PaymentProof.findOne({ order: orderId });
    if (!paymentProof) {
      return res.status(404).json({
        success: false,
        message: "Payment proof not found",
      });
    }

    // Update payment proof
    paymentProof.status = status; // "verified" or "rejected"
    paymentProof.verified_by = req.user.id;
    paymentProof.verified_at = new Date();
    paymentProof.admin_notes = adminNotes;

    await paymentProof.save();

    // Update order payment status
    const order = await Order.findById(orderId);
    if (order) {
      order.paymentStatus = status === "verified" ? "paid" : "failed";
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: `Payment proof ${status} successfully`,
      paymentProof,
    });
  } catch (error) {
    console.error("Verify payment proof error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔵 Add Admin Note to Order
export const addAdminNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Initialize adminNotes array if it doesn't exist
    if (!order.adminNotes) {
      order.adminNotes = [];
    }

    // Add new note
    order.adminNotes.push({
      note,
      added_by: req.user.id,
      added_at: new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Admin note added successfully",
      order,
    });
  } catch (error) {
    console.error("Add admin note error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Get Orders with Advanced Filtering (Admin)
export const getFilteredOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      paymentMethod,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const filter = {};

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Payment status filter
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Payment method filter
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.total = {};
      if (minAmount) {
        filter.total.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.total.$lte = parseFloat(maxAmount);
      }
    }

    // Search filter (order number, user name, user email)
    if (search) {
      const orders = await Order.find(filter)
        .populate("user", "name email")
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 });

      const filteredOrders = orders.filter(order =>
        order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        order.user?.email?.toLowerCase().includes(search.toLowerCase())
      );

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        orders: paginatedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredOrders.length / limit),
          totalOrders: filteredOrders.length,
          hasNextPage: endIndex < filteredOrders.length,
          hasPrevPage: page > 1,
        },
      });
    }

    // Regular filtering without search
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("items.product_id")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get filtered orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟠 Bulk Update Order Status (Admin)
export const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, status, trackingNumber } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs array is required",
      });
    }

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    // Set delivery date if status is delivered
    if (status === "delivered") {
      updateData.deliveredDate = new Date();
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      updateData
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} orders updated successfully`,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟣 Export Orders (Admin)
export const exportOrders = async (req, res) => {
  try {
    const { format = "json", status, startDate, endDate } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("items.product_id")
      .sort({ createdAt: -1 });

    if (format === "csv") {
      // Convert to CSV format
      const csvData = orders.map(order => ({
        orderNumber: order.orderNumber,
        customerName: order.user?.name || "",
        customerEmail: order.user?.email || "",
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderDate: order.createdAt,
        deliveredDate: order.deliveredDate || "",
        items: order.items.map(item => `${item.name} (${item.quantity})`).join("; ")
      }));

      res.status(200).json({
        success: true,
        data: csvData,
        format: "csv"
      });
    } else {
      // Return JSON format
      res.status(200).json({
        success: true,
        data: orders,
        format: "json",
        count: orders.length
      });
    }
  } catch (error) {
    console.error("Export orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};