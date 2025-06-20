// Format date to readable string
export const formatDate = (date) => {
  if (!date) return ''
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
  
  return new Date(date).toLocaleDateString('en-US', options)
}

// Format distance for display
export const formatDistance = (meters) => {
  if (!meters) return '0 km'
  
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  
  return `${(meters / 1000).toFixed(1)} km`
}

// Format duration for display
export const formatDuration = (seconds) => {
  if (!seconds) return '0 min'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  
  return `${minutes} min`
}

// Get status color and icon
export const getDeliveryStatusInfo = (status) => {
  const statusMap = {
    pending: {
      color: 'text-yellow-600 bg-yellow-100',
      icon: '⏳',
      label: 'Pending'
    },
    assigned: {
      color: 'text-blue-600 bg-blue-100',
      icon: '📋',
      label: 'Assigned'
    },
    picked_up: {
      color: 'text-purple-600 bg-purple-100',
      icon: '📦',
      label: 'Picked Up'
    },
    in_transit: {
      color: 'text-orange-600 bg-orange-100',
      icon: '🚚',
      label: 'In Transit'
    },
    delivered: {
      color: 'text-green-600 bg-green-100',
      icon: '✅',
      label: 'Delivered'
    },
    failed: {
      color: 'text-red-600 bg-red-100',
      icon: '❌',
      label: 'Failed'
    }
  }
  
  return statusMap[status] || statusMap.pending
}

// Debounce function for search/input
export const debounce = (func, wait) => {
  let timeout
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Generate random color for avatars
export const getAvatarColor = (name) => {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
  ]
  
  const index = name ? name.charCodeAt(0) % colors.length : 0
  return colors[index]
}

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Get initials from name
export const getInitials = (name) => {
  if (!name) return ''
  
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Calculate distance between two coordinates
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in kilometers
  
  return distance
}

// Check if browser supports required features
export const checkBrowserSupport = () => {
  const features = {
    geolocation: 'geolocation' in navigator,
    localStorage: typeof Storage !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    webSocket: 'WebSocket' in window,
  }
  
  return features
}

// Copy text to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}
