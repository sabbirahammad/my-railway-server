import mongoose from 'mongoose';
import DeliveryCost from '../models/deliveryCostModel.js';

// 🟢 Get Delivery Costs
export const getDeliveryCosts = async (req, res) => {
  try {
    console.log('🔍 Getting delivery costs...');

    const deliveryCost = await DeliveryCost.findOne();

    if (!deliveryCost) {
      // Return default values if no delivery cost document exists
      console.log('📦 No delivery costs found, returning defaults...');
      return res.status(200).json({
        success: true,
        deliveryCosts: {
          dhakaInside: 60,
          dhakaOutside: 120
        }
      });
    }

    console.log('📦 Returning delivery costs from database...');
    return res.status(200).json({
      success: true,
      deliveryCosts: {
        dhakaInside: deliveryCost.dhakaInside,
        dhakaOutside: deliveryCost.dhakaOutside
      }
    });
  } catch (error) {
    console.error('❌ Get delivery costs error:', error);
    // Return default values on error
    res.status(200).json({
      success: true,
      deliveryCosts: {
        dhakaInside: 60,
        dhakaOutside: 120
      }
    });
  }
};

// 🔵 Update Delivery Costs
export const updateDeliveryCosts = async (req, res) => {
  try {
    console.log('📦 Updating delivery costs...', req.body);

    const { dhakaInside, dhakaOutside } = req.body;

    // Validate input
    if (dhakaInside === undefined || dhakaOutside === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Both dhakaInside and dhakaOutside costs are required'
      });
    }

    if (dhakaInside < 0 || dhakaOutside < 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery costs cannot be negative'
      });
    }

    // Find existing delivery cost or create new one
    let deliveryCost = await DeliveryCost.findOne();

    if (!deliveryCost) {
      // Create new delivery cost document
      deliveryCost = new DeliveryCost({
        dhakaInside,
        dhakaOutside,
        updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : new mongoose.Types.ObjectId() // Fallback if no user
      });
    } else {
      // Update existing delivery cost document
      deliveryCost.dhakaInside = dhakaInside;
      deliveryCost.dhakaOutside = dhakaOutside;
      deliveryCost.updatedBy = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : deliveryCost.updatedBy;
    }

    await deliveryCost.save();

    console.log('📦 Delivery costs updated successfully');
    return res.status(200).json({
      success: true,
      message: 'Delivery costs updated successfully',
      deliveryCosts: {
        dhakaInside: deliveryCost.dhakaInside,
        dhakaOutside: deliveryCost.dhakaOutside
      }
    });
  } catch (error) {
    console.error('❌ Update delivery costs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update delivery costs',
      error: error.message
    });
  }
};
