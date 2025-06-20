// API Endpoints - Professional tip: Keep all endpoints in one place
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register', 
    PROFILE: '/auth/profile',
  },
  
  // Delivery endpoints
  DELIVERY: {
    CREATE: '/delivery/create',
    GET_BY_CUSTOMER: (customerId) => `/delivery/customer/${customerId}`,
    GET_BY_DRIVER: (driverId) => `/delivery/driver/${driverId}`,
    UPDATE: (deliveryId) => `/delivery/update/${deliveryId}`,
    GET_ALL: '/delivery/all',
  },
  
  // Route endpoints
  ROUTE: {
    OPTIMIZE: '/route/optimize',
    REFRESH: '/route/refresh',
    CURRENT: (driverId) => `/route/current/${driverId}`,
    UPDATE_LOCATION: '/route/update-location',
    REPORT_CONDITION: '/route/report-condition',
  }
}

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
  CUSTOMER: 'customer',
}

// Delivery status
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
}

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [77.5946, 12.9716], // Bangalore
  DEFAULT_ZOOM: 14,
  STYLE: {
    LIGHT: 'mapbox://styles/mapbox/light-v11',
    DARK: 'mapbox://styles/mapbox/dark-v11',
  }
}

// App configuration
export const APP_CONFIG = {
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Walmart Route Optimizer',
  COMPANY_NAME: 'Walmart',
  VERSION: '2.0.0',
  SUPPORT_EMAIL: 'support@walmart.com',
}
