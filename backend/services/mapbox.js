const mbxClient = require('@mapbox/mapbox-sdk');
const mbxDirections = require('@mapbox/mapbox-sdk/services/directions');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const DigipinService = require('./digipin');

// Initialize Mapbox client
const mapboxClient = mbxClient({ accessToken: process.env.MAPBOX_ACCESS_TOKEN });
const directionsClient = mbxDirections(mapboxClient);
const geocodingClient = mbxGeocoding(mapboxClient);

class MapboxService {

  /**
   * Calculate optimal delivery route using TSP (Traveling Salesman Problem) approach
   * @param {Array} deliveryLocations - Array of delivery locations with DIGIPIN codes
   * @param {object} startLocation - Driver's starting location {latitude, longitude}
   * @returns {object} Optimized route with waypoints and estimated time
   */
  static async calculateOptimalRoute(deliveryLocations, startLocation) {
    try {
      console.log(`🧭 Calculating optimal route for ${deliveryLocations.length} deliveries`);

      // Convert DIGIPIN codes to coordinates
      const waypoints = [startLocation]; // Start with driver's location
      
      for (const delivery of deliveryLocations) {
        if (delivery.digipinCode) {
          const coords = await DigipinService.getCoordinatesFromDigipin(delivery.digipinCode);
          waypoints.push({
            latitude: coords.latitude,
            longitude: coords.longitude,
            deliveryId: delivery._id,
            address: delivery.address
          });
        }
      }

      // Format waypoints for Mapbox API
      const mapboxWaypoints = waypoints.map(point => ({
        coordinates: [point.longitude, point.latitude]
      }));

      // Get optimized route from Mapbox
      const response = await directionsClient.getDirections({
        profile: 'driving-traffic', // Use real-time traffic
        waypoints: mapboxWaypoints,
        steps: true,
        geometries: 'geojson',
        overview: 'full',
        annotations: ['duration', 'distance']
      }).send();

      if (!response.body.routes || response.body.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = response.body.routes[0];
      
      const optimizedRoute = {
        waypoints: waypoints,
        totalDistance: Math.round(route.distance / 1000 * 100) / 100, // Convert to km
        totalDuration: Math.round(route.duration / 60), // Convert to minutes
        geometry: route.geometry,
        steps: route.legs,
        optimizedAt: new Date()
      };

      console.log(`✅ Route optimized: ${optimizedRoute.totalDistance}km, ${optimizedRoute.totalDuration}min`);
      return optimizedRoute;

    } catch (error) {
      console.error('❌ Route optimization error:', error.message);
      throw new Error(`Route optimization failed: ${error.message}`);
    }
  }

  /**
   * REFRESH ROUTE - Dynamic route re-optimization (Your key feature!)
   * @param {object} driverCurrentLocation - Driver's current location {latitude, longitude}
   * @param {Array} remainingDeliveries - Array of undelivered orders
   * @param {Array} roadConditions - Driver reported road conditions
   * @returns {object} Refreshed optimized route
   */
  static async refreshDeliveryRoute(driverCurrentLocation, remainingDeliveries, roadConditions = []) {
    try {
      console.log(`🔄 REFRESHING ROUTE: ${remainingDeliveries.length} remaining deliveries`);

      // Get current traffic conditions and road reports
      const trafficOptimizedRoute = await this.getTrafficOptimizedRoute(
        driverCurrentLocation, 
        remainingDeliveries
      );

      // Apply road condition penalties
      const adjustedRoute = await this.applyRoadConditionPenalties(
        trafficOptimizedRoute, 
        roadConditions
      );

      // Calculate new ETAs
      const routeWithETAs = await this.calculateDeliveryETAs(
        adjustedRoute, 
        driverCurrentLocation
      );

      console.log(`✅ Route refreshed successfully at ${new Date().toLocaleTimeString()}`);
      
      return {
        ...routeWithETAs,
        refreshedAt: new Date(),
        refreshReason: 'driver_requested',
        improvements: this.calculateRouteImprovement(trafficOptimizedRoute, adjustedRoute)
      };

    } catch (error) {
      console.error('❌ Route refresh error:', error.message);
      throw new Error(`Route refresh failed: ${error.message}`);
    }
  }

  /**
   * Get traffic-aware route optimization
   * @param {object} currentLocation - Current driver location
   * @param {Array} deliveries - Remaining deliveries
   * @returns {object} Traffic-optimized route
   */
  static async getTrafficOptimizedRoute(currentLocation, deliveries) {
    try {
      // Convert deliveries to coordinates
      const destinations = [];
      
      for (const delivery of deliveries) {
        const coords = await DigipinService.getCoordinatesFromDigipin(
          delivery.delivery.digipinCode
        );
        destinations.push({
          coordinates: [coords.longitude, coords.latitude],
          deliveryId: delivery._id,
          address: delivery.delivery.address,
          scheduledTime: delivery.delivery.scheduledTime
        });
      }

      // Create waypoints array
      const waypoints = [
        { coordinates: [currentLocation.longitude, currentLocation.latitude] },
        ...destinations
      ];

      // Get route with current traffic data
      const response = await directionsClient.getDirections({
        profile: 'driving-traffic', // Real-time traffic
        waypoints: waypoints,
        steps: true,
        geometries: 'geojson',
        overview: 'full',
        annotations: ['duration', 'distance', 'speed'],
        continue_straight: false // Allow U-turns if needed
      }).send();

      const route = response.body.routes[0];
      
      return {
        waypoints: destinations,
        totalDistance: Math.round(route.distance / 1000 * 100) / 100,
        totalDuration: Math.round(route.duration / 60),
        geometry: route.geometry,
        trafficData: route.legs,
        optimizedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Traffic optimization error:', error.message);
      throw new Error(`Traffic optimization failed: ${error.message}`);
    }
  }

  /**
   * Apply road condition penalties to route
   * @param {object} route - Base route
   * @param {Array} roadConditions - Driver reported conditions
   * @returns {object} Route with condition adjustments
   */
  static async applyRoadConditionPenalties(route, roadConditions) {
    try {
      if (!roadConditions || roadConditions.length === 0) {
        return route;
      }

      let adjustedDuration = route.totalDuration;
      const appliedConditions = [];

      // Apply penalties based on road conditions
      for (const condition of roadConditions) {
        const penalty = this.getConditionPenalty(condition.type);
        adjustedDuration += penalty;
        
        appliedConditions.push({
          type: condition.type,
          location: condition.location,
          penalty: penalty,
          reportedBy: condition.reportedBy
        });
      }

      console.log(`⚠️ Applied road condition penalties: +${adjustedDuration - route.totalDuration} minutes`);

      return {
        ...route,
        totalDuration: Math.round(adjustedDuration),
        roadConditionAdjustments: appliedConditions,
        adjustedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Road condition adjustment error:', error.message);
      return route; // Return original route if adjustment fails
    }
  }

  /**
   * Calculate delivery ETAs for each stop
   * @param {object} route - Optimized route
   * @param {object} currentLocation - Driver's current location
   * @returns {object} Route with ETA calculations
   */
  static async calculateDeliveryETAs(route, currentLocation) {
    try {
      const currentTime = new Date();
      let cumulativeTime = 0;
      const deliveryETAs = [];

      for (let i = 0; i < route.waypoints.length; i++) {
        const waypoint = route.waypoints[i];
        
        // Add travel time to this waypoint
        const segmentDuration = route.trafficData[i]?.duration || 0;
        cumulativeTime += Math.round(segmentDuration / 60); // Convert to minutes
        
        // Add estimated delivery time (5 minutes per delivery)
        if (i > 0) { // Skip first waypoint (current location)
          cumulativeTime += 5;
        }

        const eta = new Date(currentTime.getTime() + (cumulativeTime * 60 * 1000));
        
        deliveryETAs.push({
          deliveryId: waypoint.deliveryId,
          address: waypoint.address,
          estimatedArrival: eta,
          sequenceNumber: i,
          cumulativeTime: cumulativeTime
        });
      }

      return {
        ...route,
        deliveryETAs: deliveryETAs,
        calculatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ ETA calculation error:', error.message);
      throw new Error(`ETA calculation failed: ${error.message}`);
    }
  }

  /**
   * Get condition penalty in minutes
   * @param {string} conditionType - Type of road condition
   * @returns {number} Penalty in minutes
   */
  static getConditionPenalty(conditionType) {
    const penalties = {
      'heavy_traffic': 15,
      'construction': 10,
      'road_closure': 20,
      'pothole': 5,
      'narrow_road': 8,
      'weather': 12,
      'accident': 25
    };
    
    return penalties[conditionType] || 5; // Default 5 minutes penalty
  }

  /**
   * Calculate route improvement metrics
   * @param {object} oldRoute - Previous route
   * @param {object} newRoute - New optimized route
   * @returns {object} Improvement metrics
   */
  static calculateRouteImprovement(oldRoute, newRoute) {
    const timeSaved = oldRoute.totalDuration - newRoute.totalDuration;
    const distanceSaved = oldRoute.totalDistance - newRoute.totalDistance;
    
    return {
      timeSaved: Math.round(timeSaved), // in minutes
      distanceSaved: Math.round(distanceSaved * 100) / 100, // in km
      fuelSaved: Math.round(distanceSaved * 0.1 * 100) / 100, // Estimated fuel in liters
      improvementPercentage: Math.round((timeSaved / oldRoute.totalDuration) * 100)
    };
  }

  /**
   * Get geocoding for address search
   * @param {string} address - Address to geocode
   * @returns {object} Coordinates and formatted address
   */
  static async geocodeAddress(address) {
    try {
      const response = await geocodingClient.forwardGeocode({
        query: address,
        limit: 1,
        country: ['IN'] // Restrict to India
      }).send();

      if (!response.body.features || response.body.features.length === 0) {
        throw new Error('Address not found');
      }

      const feature = response.body.features[0];
      const [longitude, latitude] = feature.center;

      return {
        latitude,
        longitude,
        formattedAddress: feature.place_name,
        confidence: feature.relevance
      };

    } catch (error) {
      console.error('❌ Geocoding error:', error.message);
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }
}

module.exports = MapboxService;
