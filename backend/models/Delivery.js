const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  // Basic Delivery Information
  orderId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'DEL' + Date.now() + Math.floor(Math.random() * 1000)
  },
  
  // Customer & Driver Assignment
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Pickup Information
  pickup: {
    address: {
      type: String,
      required: true
    },
    digipinCode: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    contactPerson: {
      name: String,
      phone: String
    },
    scheduledTime: {
      type: Date,
      required: true
    }
  },
  
  // Delivery Information
  delivery: {
    address: {
      type: String,
      required: true
    },
    digipinCode: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    contactPerson: {
      name: String,
      phone: String
    },
    scheduledTime: {
      type: Date,
      required: true
    }
  },
  
  // Delivery Status
  status: {
    type: String,
    enum: [
      'pending',      // Order created, waiting for driver assignment
      'assigned',     // Driver assigned, not started
      'picked_up',    // Package picked up from sender
      'in_transit',   // On the way to delivery location
      'delivered',    // Successfully delivered
      'failed',       // Delivery failed
      'cancelled'     // Order cancelled
    ],
    default: 'pending'
  },
  
  // Package Details
  package: {
    description: {
      type: String,
      required: true
    },
    weight: {
      type: Number, // in kg
      required: true
    },
    value: {
      type: Number, // in rupees
      default: 0
    },
    fragile: {
      type: Boolean,
      default: false
    }
  },
  
  // Route Optimization Data
  routeData: {
    optimizedRoute: [{
      latitude: Number,
      longitude: Number,
      digipinCode: String,
      sequenceNumber: Number
    }],
    totalDistance: {
      type: Number, // in kilometers
      default: 0
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 0
    },
    lastOptimized: {
      type: Date,
      default: null
    },
    refreshCount: {
      type: Number,
      default: 0
    }
  },
  
  // Tracking Information
  tracking: {
    currentLocation: {
      latitude: Number,
      longitude: Number,
      digipinCode: String,
      timestamp: Date
    },
    estimatedArrival: {
      type: Date,
      default: null
    },
    actualPickupTime: {
      type: Date,
      default: null
    },
    actualDeliveryTime: {
      type: Date,
      default: null
    }
  },
  
  // Pricing
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    distancePrice: {
      type: Number,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true
    }
  },
  
  // Additional Notes
  notes: {
    customerNotes: String,
    driverNotes: String,
    adminNotes: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
deliverySchema.index({ customer: 1, status: 1 });
deliverySchema.index({ driver: 1, status: 1 });
deliverySchema.index({ orderId: 1 });
deliverySchema.index({ 'pickup.digipinCode': 1 });
deliverySchema.index({ 'delivery.digipinCode': 1 });

// Calculate total price before saving
deliverySchema.pre('save', function(next) {
  if (this.isModified('pricing.basePrice') || this.isModified('pricing.distancePrice')) {
    this.pricing.totalPrice = this.pricing.basePrice + this.pricing.distancePrice;
  }
  next();
});

// Static method to find deliveries by status
deliverySchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('customer driver', 'name phone email');
};

// Static method to find driver's deliveries
deliverySchema.statics.findDriverDeliveries = function(driverId) {
  return this.find({ 
    driver: driverId,
    status: { $in: ['assigned', 'picked_up', 'in_transit'] }
  }).populate('customer', 'name phone');
};

module.exports = mongoose.model('Delivery', deliverySchema);
