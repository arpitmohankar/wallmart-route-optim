const express = require('express');
const jwt = require('jsonwebtoken');
const Delivery = require('../models/Delivery');
const User = require('../models/Users');
const DigipinService = require('../services/digipin');
const MapboxService = require('../services/mapbox');

const router = express.Router();

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * @route   POST /api/delivery/create
 * @desc    Create new delivery order
 * @access  Private (Customer/Admin)
 */
router.post('/create', auth, async (req, res) => {
  try {
    const { 
      pickupAddress, pickupCoordinates, pickupContact, pickupTime,
      deliveryAddress, deliveryCoordinates, deliveryContact, deliveryTime,
      packageDetails, notes 
    } = req.body;

    // Convert addresses to DIGIPIN
    const pickupDigipin = await DigipinService.convertToDigipin(
      pickupCoordinates.latitude, 
      pickupCoordinates.longitude
    );

    const deliveryDigipin = await DigipinService.convertToDigipin(
      deliveryCoordinates.latitude, 
      deliveryCoordinates.longitude
    );

    // Calculate base pricing (simple formula)
    const distance = await DigipinService.calculateDistance(pickupDigipin, deliveryDigipin);
    const basePrice = 50; // Base price in rupees
    const distancePrice = distance * 10; // 10 rupees per km

    // Create delivery object
    const deliveryData = {
      customer: req.user._id,
      pickup: {
        address: pickupAddress,
        digipinCode: pickupDigipin,
        coordinates: pickupCoordinates,
        contactPerson: pickupContact,
        scheduledTime: new Date(pickupTime)
      },
      delivery: {
        address: deliveryAddress,
        digipinCode: deliveryDigipin,
        coordinates: deliveryCoordinates,
        contactPerson: deliveryContact,
        scheduledTime: new Date(deliveryTime)
      },
      package: packageDetails,
      pricing: {
        basePrice,
        distancePrice,
        totalPrice: basePrice + distancePrice
      },
      notes: {
        customerNotes: notes
      }
    };

    const delivery = new Delivery(deliveryData);
    await delivery.save();

    // Populate customer details
    await delivery.populate('customer', 'name phone email');

    res.status(201).json({
      success: true,
      message: 'Delivery created successfully',
      delivery: delivery
    });

  } catch (error) {
    console.error('Delivery creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create delivery', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/delivery/customer/:customerId
 * @desc    Get customer's delivery orders
 * @access  Private (Customer/Admin)
 */
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== customerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const deliveries = await Delivery.find({ customer: customerId })
      .populate('driver', 'name phone vehicleInfo')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: deliveries.length,
      deliveries: deliveries
    });

  } catch (error) {
    console.error('Customer deliveries fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch deliveries', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/delivery/driver/:driverId
 * @desc    Get driver's assigned deliveries
 * @access  Private (Driver/Admin)
 */
router.get('/driver/:driverId', auth, async (req, res) => {
  try {
    const { driverId } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== driverId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const deliveries = await Delivery.findDriverDeliveries(driverId);

    res.json({
      success: true,
      count: deliveries.length,
      deliveries: deliveries
    });

  } catch (error) {
    console.error('Driver deliveries fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch driver deliveries', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/delivery/update/:deliveryId
 * @desc    Update delivery status
 * @access  Private (Driver/Admin)
 */
router.put('/update/:deliveryId', auth, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status, location, notes } = req.body;

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        req.user._id.toString() !== delivery.driver?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update delivery status
    delivery.status = status;

    // Update location if provided
    if (location) {
      const digipinCode = await DigipinService.convertToDigipin(
        location.latitude, 
        location.longitude
      );

      delivery.tracking.currentLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        digipinCode: digipinCode,
        timestamp: new Date()
      };
    }

    // Update notes
    if (notes) {
      delivery.notes.driverNotes = notes;
    }

    // Set actual pickup/delivery times
    if (status === 'picked_up') {
      delivery.tracking.actualPickupTime = new Date();
    } else if (status === 'delivered') {
      delivery.tracking.actualDeliveryTime = new Date();
    }

    await delivery.save();

    res.json({
      success: true,
      message: 'Delivery updated successfully',
      delivery: delivery
    });

  } catch (error) {
    console.error('Delivery update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update delivery', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/delivery/all
 * @desc    Get all deliveries (Admin only)
 * @access  Private (Admin)
 */
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const query = status ? { status } : {};

    const deliveries = await Delivery.find(query)
      .populate('customer', 'name phone email')
      .populate('driver', 'name phone vehicleInfo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Delivery.countDocuments(query);

    res.json({
      success: true,
      count: deliveries.length,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      deliveries: deliveries
    });

  } catch (error) {
    console.error('All deliveries fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch all deliveries', 
      error: error.message 
    });
  }
});

module.exports = router;
