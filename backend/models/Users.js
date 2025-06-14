const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // User Role
  role: {
    type: String,
    enum: ['driver', 'customer', 'admin'],
    required: [true, 'User role is required']
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Driver-specific Information
  vehicleInfo: {
    type: {
      type: String,
      enum: ['truck', 'van', 'bike', 'car'],
      default: null
    },
    licensePlate: {
      type: String,
      default: null
    },
    capacity: {
      type: Number, // in kg
      default: null
    },
    dimensions: {
      length: Number, // in meters
      width: Number,
      height: Number
    }
  },
  
  // Customer-specific Information
  addresses: [{
    label: {
      type: String, // 'home', 'work', 'other'
      default: 'home'
    },
    fullAddress: {
      type: String,
      required: true
    },
    digipinCode: {
      type: String, // DIGIPIN code for precise location
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
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  // Current Location (for drivers)
  currentLocation: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    digipinCode: {
      type: String,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with salt rounds = 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find drivers
userSchema.statics.findDrivers = function() {
  return this.find({ role: 'driver', isActive: true });
};

module.exports = mongoose.model('User', userSchema);
