const express = require('express');
const jwt = require('jsonwebtoken');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const MapboxService = require('../services/mapbox');
const DigipinService = require('../services/digipin');

const router = express.Router();

// Authentication middleware
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
 * @route   POST /api/route/optimize
 * @desc    Get initial optimized route for driver
 * @access  Private (Driver/Admin)
 */
router.post('/optimize', auth, async (req, res) => {
  try {
    const { driverId, currentLocation } = req.body;

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== driverId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get driver's assigned deliveries
    const deliveries = await Delivery.findDriverDeliveries(driverId);
    
    if (deliveries.length === 0) {
      return res.json({
        success: true,
        message: 'No deliveries assigned',
        route: null
      });
    }

    // Calculate optimal route
    const optimizedRoute = await MapboxService.calculateOptimalRoute(
      deliveries,
      currentLocation
    );

    // Update delivery records with route data
    for (let i = 0; i < deliveries.length; i++) {
      const delivery = deliveries[i];
      delivery.routeData = {
        optimizedRoute: optimizedRoute.waypoints,
        totalDistance: optimizedRoute.totalDistance,
        estimatedDuration: optimizedRoute.totalDuration,
        lastOptimized: new Date(),
        refreshCount: 0
      };
      await delivery.save();
    }

    res.json({
      success: true,
      message: 'Route optimized successfully',
      route: optimizedRoute,
      deliveryCount: deliveries.length
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Route optimization failed', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/route/refresh
 * @desc    REFRESH ROUTE - Dynamic route re-optimization (Your key feature!)
 * @access  Private (Driver)
 */
router.post('/refresh', auth, async (req, res) => {
  try {
    const { driverId, currentLocation, roadConditions = [] } = req.body;

    console.log(`🔄 ROUTE REFRESH REQUEST from driver: ${driverId}`);

    // Check authorization - only the driver can refresh their own route
    if (req.user._id.toString() !== driverId) {
      return res.status(403).json({ message: 'Only driver can refresh their own route' });
    }

    // Get remaining undelivered orders
    const remainingDeliveries = await Delivery.find({
      driver: driverId,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    });

    if (remainingDeliveries.length === 0) {
      return res.json({
        success: true,
        message: 'No remaining deliveries to optimize',
        route: null
      });
    }

    // Get refreshed route with traffic and road conditions
    const refreshedRoute = await MapboxService.refreshDeliveryRoute(
      currentLocation,
      remainingDeliveries,
      roadConditions
    );

    // Update delivery records with new route data
    for (const delivery of remainingDeliveries) {
      delivery.routeData.optimizedRoute = refreshedRoute.waypoints;
      delivery.routeData.totalDistance = refreshedRoute.totalDistance;
      delivery.routeData.estimatedDuration = refreshedRoute.totalDuration;
      delivery.routeData.lastOptimized = new Date();
      delivery.routeData.refreshCount += 1;
      
      // Update ETAs for this delivery
      const deliveryETA = refreshedRoute.deliveryETAs?.find(
        eta => eta.deliveryId?.toString() === delivery._id.toString()
      );
      if (deliveryETA) {
        delivery.tracking.estimatedArrival = deliveryETA.estimatedArrival;
      }

      await delivery.save();
    }

    // Broadcast route update to connected clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`driver-${driverId}`).emit('route-refreshed', {
        route: refreshedRoute,
        timestamp: new Date()
      });

      // Notify customers of updated ETAs
      for (const delivery of remainingDeliveries) {
        io.to(`delivery-${delivery._id}`).emit('eta-updated', {
          deliveryId: delivery._id,
          newETA: delivery.tracking.estimatedArrival,
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: 'Route refreshed successfully!',
      route: refreshedRoute,
      improvements: refreshedRoute.improvements,
      refreshCount: remainingDeliveries[0]?.routeData?.refreshCount || 1,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Route refresh error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Route refresh failed', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/route/current/:driverId
 * @desc    Get driver's current optimized route
 * @access  Private (Driver/Admin)
 */
router.get('/current/:driverId', auth, async (req, res) => {
  try {
    const { driverId } = req.params;

    // Check authorization
    if (req.user.role !== 'admin' && req.user._id.toString() !== driverId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const deliveries = await Delivery.find({
      driver: driverId,
      status: { $in: ['assigned', 'picked_up', 'in_transit'] }
    }).populate('customer', 'name phone');

    if (deliveries.length === 0) {
      return res.json({
        success: true,
        message: 'No active deliveries',
        route: null
      });
    }

    // Get route data from the first delivery (they all share the same route)
    const routeData = deliveries[0].routeData;

    res.json({
      success: true,
      route: routeData,
      deliveries: deliveries,
      lastOptimized: routeData.lastOptimized,
      refreshCount: routeData.refreshCount
    });

  } catch (error) {
    console.error('Current route fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch current route', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/route/update-location
 * @desc    Update driver's real-time location
 * @access  Private (Driver)
 */
router.post('/update-location', auth, async (req, res) => {
  try {
    const { driverId, location } = req.body;

    // Check authorization
    if (req.user._id.toString() !== driverId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Convert location to DIGIPIN
    const digipinCode = await DigipinService.convertToDigipin(
      location.latitude,
      location.longitude
    );

    // Update user's current location
    await User.findByIdAndUpdate(driverId, {
      currentLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        digipinCode: digipinCode,
        lastUpdated: new Date()
      }
    });

    // Update tracking for active deliveries
    await Delivery.updateMany(
      { 
        driver: driverId, 
        status: { $in: ['picked_up', 'in_transit'] } 
      },
      {
        'tracking.currentLocation': {
          latitude: location.latitude,
          longitude: location.longitude,
          digipinCode: digipinCode,
          timestamp: new Date()
        }
      }
    );

    // Broadcast location update via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Get active deliveries to notify customers
      const activeDeliveries = await Delivery.find({
        driver: driverId,
        status: { $in: ['picked_up', 'in_transit'] }
      });

      // Notify customers tracking these deliveries
      for (const delivery of activeDeliveries) {
        io.to(`delivery-${delivery._id}`).emit('location-update', {
          deliveryId: delivery._id,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            digipinCode: digipinCode
          },
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        digipinCode: digipinCode,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Location update failed', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/route/report-condition
 * @desc    Report road condition by driver
 * @access  Private (Driver)
 */
router.post('/report-condition', auth, async (req, res) => {
  try {
    const { location, conditionType, description, severity } = req.body;

    // Convert location to DIGIPIN
    const digipinCode = await DigipinService.convertToDigipin(
      location.latitude,
      location.longitude
    );

    // For simplicity, we'll just log the road condition
    // In a real app, you'd save this to a RoadCondition model
    console.log(`🚧 Road condition reported:`, {
      reporter: req.user.name,
      location: digipinCode,
      type: conditionType,
      description,
      severity,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Road condition reported successfully',
      condition: {
        location: digipinCode,
        type: conditionType,
        reportedBy: req.user.name,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Road condition report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to report road condition', 
      error: error.message 
    });
  }
});

module.exports = router;
