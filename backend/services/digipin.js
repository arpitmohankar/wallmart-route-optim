const { getDIGIPINFromLatLon, getLatLonFromDIGIPIN } = require('digipin');

class DigipinService {
  
  /**
   * Convert latitude/longitude coordinates to DIGIPIN code
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {string} DIGIPIN code (e.g., "G4J-9K4-7L")
   */
  static async convertToDigipin(latitude, longitude) {
    try {
      // Validate input coordinates
      if (!this.isValidCoordinate(latitude, longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      // Convert to DIGIPIN using the npm package
      const digipinCode = getDIGIPINFromLatLon(latitude, longitude);
      
      if (!digipinCode) {
        throw new Error('Failed to generate DIGIPIN code');
      }

      console.log(`📍 Converted coordinates (${latitude}, ${longitude}) to DIGIPIN: ${digipinCode}`);
      return digipinCode;

    } catch (error) {
      console.error('❌ DIGIPIN conversion error:', error.message);
      throw new Error(`DIGIPIN conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert DIGIPIN code back to latitude/longitude coordinates
   * @param {string} digipinCode - DIGIPIN code (e.g., "G4J-9K4-7L")
   * @returns {object} Coordinates object {latitude, longitude}
   */
  static async getCoordinatesFromDigipin(digipinCode) {
    try {
      // Validate DIGIPIN format
      if (!this.isValidDigipinFormat(digipinCode)) {
        throw new Error('Invalid DIGIPIN format');
      }

      // Convert DIGIPIN to coordinates using the npm package
      const coordinates = getLatLonFromDIGIPIN(digipinCode);
      
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        throw new Error('Failed to decode DIGIPIN code');
      }

      const result = {
        latitude: coordinates.lat,
        longitude: coordinates.lng
      };

      console.log(`🎯 Converted DIGIPIN ${digipinCode} to coordinates:`, result);
      return result;

    } catch (error) {
      console.error('❌ DIGIPIN decoding error:', error.message);
      throw new Error(`DIGIPIN decoding failed: ${error.message}`);
    }
  }

  /**
   * Validate DIGIPIN code format
   * @param {string} digipinCode - DIGIPIN code to validate
   * @returns {boolean} True if valid format
   */
  static isValidDigipinFormat(digipinCode) {
    if (!digipinCode || typeof digipinCode !== 'string') {
      return false;
    }

    // DIGIPIN format: XXX-XXX-XX (letters and numbers)
    const digipinRegex = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{2}$/;
    return digipinRegex.test(digipinCode.toUpperCase());
  }

  /**
   * Validate coordinate values
   * @param {number} latitude - Latitude value
   * @param {number} longitude - Longitude value
   * @returns {boolean} True if valid coordinates
   */
  static isValidCoordinate(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Store address with DIGIPIN for deliveries
   * @param {string} fullAddress - Complete address string
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @returns {object} Address object with DIGIPIN
   */
  static async createAddressWithDigipin(fullAddress, latitude, longitude) {
    try {
      const digipinCode = await this.convertToDigipin(latitude, longitude);
      
      return {
        fullAddress,
        digipinCode,
        coordinates: {
          latitude,
          longitude
        },
        createdAt: new Date()
      };

    } catch (error) {
      console.error('❌ Address creation error:', error.message);
      throw new Error(`Failed to create address with DIGIPIN: ${error.message}`);
    }
  }

  /**
   * Batch convert multiple coordinates to DIGIPIN codes
   * @param {Array} locations - Array of {latitude, longitude} objects
   * @returns {Array} Array of locations with DIGIPIN codes
   */
  static async batchConvertToDigipin(locations) {
    try {
      const results = [];
      
      for (const location of locations) {
        const digipinCode = await this.convertToDigipin(
          location.latitude, 
          location.longitude
        );
        
        results.push({
          ...location,
          digipinCode
        });
      }

      console.log(`🔄 Batch converted ${results.length} locations to DIGIPIN`);
      return results;

    } catch (error) {
      console.error('❌ Batch conversion error:', error.message);
      throw new Error(`Batch DIGIPIN conversion failed: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two DIGIPIN codes
   * @param {string} digipin1 - First DIGIPIN code
   * @param {string} digipin2 - Second DIGIPIN code
   * @returns {number} Distance in kilometers
   */
  static async calculateDistance(digipin1, digipin2) {
    try {
      const coord1 = await this.getCoordinatesFromDigipin(digipin1);
      const coord2 = await this.getCoordinatesFromDigipin(digipin2);
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in kilometers
      const dLat = this.toRad(coord2.latitude - coord1.latitude);
      const dLon = this.toRad(coord2.longitude - coord1.longitude);
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(coord1.latitude)) * Math.cos(this.toRad(coord2.latitude)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return Math.round(distance * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      console.error('❌ Distance calculation error:', error.message);
      throw new Error(`Distance calculation failed: ${error.message}`);
    }
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} Radians
   */
  static toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = DigipinService;
