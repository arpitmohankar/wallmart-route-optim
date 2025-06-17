/* eslint-disable no-undef */
// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
}

// Mapbox Configuration
export const MAPBOX_CONFIG = {
  ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  STYLE: {
    LIGHT: 'mapbox://styles/mapbox/light-v11',
    DARK: 'mapbox://styles/mapbox/dark-v11',
    NAVIGATION: 'mapbox://styles/mapbox/navigation-day-v1',
  },
  DEFAULT_CENTER: [77.5946, 12.9716], // Bangalore, India
  DEFAULT_ZOOM: 12,
  MAX_ZOOM: 18,
  MIN_ZOOM: 8,
}

// Application Configuration
export const APP_CONFIG = {
  NAME: 'Smart Delivery Optimizer',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  BUILD_TIME: __BUILD_TIME__,
  AUTHOR: 'Smart Delivery Team',
  DESCRIPTION: 'AI-powered last-mile delivery optimization with DIGIPIN',
}

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
  CUSTOMER: 'customer',
}

// Delivery Status
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

// Driver Status
export const DRIVER_STATUS = {
  ACTIVE: 'active',
  BUSY: 'busy',
  OFFLINE: 'offline',
  BREAK: 'break',
}

// Road Conditions
export const ROAD_CONDITIONS = {
  HEAVY_TRAFFIC: 'heavy_traffic',
  CONSTRUCTION: 'construction',
  ROAD_CLOSURE: 'road_closure',
  POTHOLE: 'pothole',
  NARROW_ROAD: 'narrow_road',
  WEATHER: 'weather',
  ACCIDENT: 'accident',
}

// Location Configuration
export const LOCATION_CONFIG = {
  HIGH_ACCURACY: true,
  TIMEOUT: 15000,
  MAXIMUM_AGE: 10000,
  UPDATE_INTERVAL: 5000, // 5 seconds
  MIN_ACCURACY: 100, // meters
}

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  TYPES: {
    DELIVERY_UPDATE: 'delivery_update',
    ROUTE_OPTIMIZED: 'route_optimized',
    DRIVER_ASSIGNED: 'driver_assigned',
    ETA_UPDATE: 'eta_update',
    PROXIMITY_ALERT: 'proximity_alert',
  },
}

// Theme Configuration
export const THEME_CONFIG = {
  DEFAULT: 'light',
  STORAGE_KEY: 'delivery-app-theme',
  TRANSITION_DURATION: 300,
}

// Cache Configuration
export const CACHE_CONFIG = {
  API_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  STATIC_CACHE_TIME: 24 * 60 * 60 * 1000, // 24 hours
  LOCATION_CACHE_TIME: 30 * 1000, // 30 seconds
}

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please login again.',
  LOCATION_DENIED: 'Location access denied. Please enable location permissions.',
  INVALID_INPUT: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  OFFLINE: 'You are currently offline. Some features may not work.',
}

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  ROUTE_OPTIMIZED: 'Route optimized successfully!',
  LOCATION_UPDATED: 'Location updated',
  STATUS_UPDATED: 'Status updated successfully',
  ORDER_CREATED: 'Order created successfully!',
}

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{10}$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
}

// Features Flags
export const FEATURE_FLAGS = {
  DARK_MODE: true,
  PWA_INSTALL: true,
  PUSH_NOTIFICATIONS: true,
  OFFLINE_MODE: true,
  VOICE_NAVIGATION: false,
  BIOMETRIC_AUTH: false,
}

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
  LAZY_LOAD_THRESHOLD: 100,
  PAGINATION_SIZE: 20,
  MAX_CONCURRENT_REQUESTS: 6,
}

// Development Configuration
export const DEV_CONFIG = {
  ENABLE_LOGGING: import.meta.env.DEV,
  MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA === 'true',
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
  BYPASS_AUTH: import.meta.env.VITE_BYPASS_AUTH === 'true',
}

export default {
  API_CONFIG,
  MAPBOX_CONFIG,
  APP_CONFIG,
  USER_ROLES,
  DELIVERY_STATUS,
  DRIVER_STATUS,
  ROAD_CONDITIONS,
  LOCATION_CONFIG,
  NOTIFICATION_CONFIG,
  THEME_CONFIG,
  CACHE_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_RULES,
  FEATURE_FLAGS,
  PERFORMANCE_CONFIG,
  DEV_CONFIG,
}
