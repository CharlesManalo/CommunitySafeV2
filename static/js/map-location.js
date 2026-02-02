/**
 * Google Maps Location Handler for Hazard Reporting System
 * Handles interactive map marking and location details
 */

class MapLocationManager {
    constructor() {
        this.mapFrame = document.getElementById('google-map');
        this.latitudeSpan = document.getElementById('latitude');
        this.longitudeSpan = document.getElementById('longitude');
        this.locationDetailsInput = document.getElementById('location-details');
        this.locationStatus = document.getElementById('location-status');
        this.locationError = document.getElementById('location-error');
        
        this.markedPosition = null;
        this.isMapInteractive = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupMapInteraction();
        this.loadSavedLocation();
    }
    
    bindEvents() {
        // Location details input validation
        if (this.locationDetailsInput) {
            this.locationDetailsInput.addEventListener('input', () => this.validateLocation());
            this.locationDetailsInput.addEventListener('blur', () => this.validateLocation());
        }
        
        // Map click handler (will be set up after map loads)
        this.setupMapClickListener();
    }
    
    setupMapInteraction() {
        // Since we're using an iframe, we need to enable map interaction
        // The iframe will need to be replaced with an interactive map implementation
        this.enableMapClicking();
    }
    
    enableMapClicking() {
        // For now, we'll simulate map clicking with coordinates
        // In a real implementation, you'd use Google Maps JavaScript API
        
        // Add click event to map container
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.addEventListener('click', (e) => {
                // Only handle clicks on the map itself, not on controls
                if (e.target === this.mapFrame) {
                    this.simulateMapClick(e);
                }
            });
        }
        
        // Add instruction click handler
        const instructions = document.querySelector('.map-instructions');
        if (instructions) {
            instructions.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showMapHelp();
            });
        }
    }
    
    simulateMapClick(event) {
        // Get click position relative to the map
        const rect = this.mapFrame.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert pixel coordinates to lat/lng (approximation)
        // This is a simplified conversion - in reality you'd use the Maps API
        const lat = this.pixelToLat(y, rect.height);
        const lng = this.pixelToLng(x, rect.width);
        
        this.markLocation(lat, lng);
    }
    
    pixelToLat(pixelY, mapHeight) {
        // Convert pixel Y to latitude (approximation for Philippines area)
        const latRange = 0.1; // Approximate range for the map view
        const centerLat = 13.3809924; // Center latitude from your embed URL
        const offset = (pixelY / mapHeight - 0.5) * latRange;
        return centerLat - offset;
    }
    
    pixelToLng(pixelX, mapWidth) {
        // Convert pixel X to longitude (approximation for Philippines area)
        const lngRange = 0.1; // Approximate range for the map view
        const centerLng = 121.1826176; // Center longitude from your embed URL
        const offset = (pixelX / mapWidth - 0.5) * lngRange;
        return centerLng + offset;
    }
    
    markLocation(latitude, longitude) {
        this.markedPosition = {
            latitude: latitude,
            longitude: longitude
        };
        
        // Update coordinate display
        this.latitudeSpan.textContent = latitude.toFixed(6);
        this.longitudeSpan.textContent = longitude.toFixed(6);
        
        // Show success status
        this.showLocationStatus();
        
        // Add visual marker (overlay)
        this.addMapMarker(latitude, longitude);
        
        // Update form fields
        this.updateFormFields(latitude, longitude);
        
        // Validate complete location
        this.validateLocation();
        
        console.log('Location marked:', latitude, longitude);
    }
    
    addMapMarker(lat, lng) {
        // Create a simple marker overlay
        const existingMarker = document.querySelector('.map-marker');
        if (existingMarker) {
            existingMarker.remove();
        }
        
        const marker = document.createElement('div');
        marker.className = 'map-marker';
        marker.innerHTML = '📍';
        marker.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            z-index: 1000;
            pointer-events: none;
            animation: dropIn 0.3s ease-out;
        `;
        
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.style.position = 'relative';
            mapContainer.appendChild(marker);
        }
    }
    
    showLocationStatus() {
        if (this.locationStatus) {
            this.locationStatus.style.display = 'block';
        }
        this.hideError();
    }
    
    hideLocationStatus() {
        if (this.locationStatus) {
            this.locationStatus.style.display = 'none';
        }
    }
    
    showError(message) {
        if (this.locationError) {
            this.locationError.innerHTML = `<p class="text-error">❌ ${message}</p>`;
            this.locationError.style.display = 'block';
        }
        this.hideLocationStatus();
    }
    
    hideError() {
        if (this.locationError) {
            this.locationError.style.display = 'none';
        }
    }
    
    validateLocation() {
        const hasCoordinates = this.markedPosition !== null;
        const hasDetails = this.locationDetailsInput && this.locationDetailsInput.value.trim().length > 0;
        
        if (hasCoordinates && hasDetails) {
            this.showLocationStatus();
            return true;
        } else if (!hasCoordinates && hasDetails) {
            this.showError('Please mark the location on the map');
            return false;
        } else if (hasCoordinates && !hasDetails) {
            this.showError('Please provide location details');
            return false;
        } else {
            this.hideLocationStatus();
            this.hideError();
            return false;
        }
    }
    
    updateFormFields(latitude, longitude) {
        // Create hidden form fields if they don't exist
        let latField = document.getElementById('latitude-field');
        let lngField = document.getElementById('longitude-field');
        
        if (!latField) {
            latField = document.createElement('input');
            latField.type = 'hidden';
            latField.id = 'latitude-field';
            latField.name = 'latitude';
            document.querySelector('form')?.appendChild(latField);
        }
        
        if (!lngField) {
            lngField = document.createElement('input');
            lngField.type = 'hidden';
            lngField.id = 'longitude-field';
            lngField.name = 'longitude';
            document.querySelector('form')?.appendChild(lngField);
        }
        
        // Update field values
        if (latField) latField.value = latitude;
        if (lngField) lngField.value = longitude;
    }
    
    setupMapClickListener() {
        // This would be used with Google Maps JavaScript API
        // For now, we're using the iframe approach
    }
    
    showMapHelp() {
        alert('Click anywhere on the map to mark the hazard location. You can zoom in/out for better accuracy.');
    }
    
    loadSavedLocation() {
        // Load any previously saved location from localStorage
        const savedLat = localStorage.getItem('hazardLatitude');
        const savedLng = localStorage.getItem('hazardLongitude');
        const savedDetails = localStorage.getItem('hazardLocationDetails');
        
        if (savedLat && savedLng) {
            this.markLocation(parseFloat(savedLat), parseFloat(savedLng));
            if (this.locationDetailsInput && savedDetails) {
                this.locationDetailsInput.value = savedDetails;
            }
        }
    }
    
    saveLocation() {
        // Save current location to localStorage
        if (this.markedPosition) {
            localStorage.setItem('hazardLatitude', this.markedPosition.latitude);
            localStorage.setItem('hazardLongitude', this.markedPosition.longitude);
        }
        if (this.locationDetailsInput) {
            localStorage.setItem('hazardLocationDetails', this.locationDetailsInput.value);
        }
    }
    
    clearLocation() {
        // Clear marked location
        this.markedPosition = null;
        this.latitudeSpan.textContent = '--';
        this.longitudeSpan.textContent = '--';
        
        // Remove marker
        const marker = document.querySelector('.map-marker');
        if (marker) {
            marker.remove();
        }
        
        // Clear form fields
        const latField = document.getElementById('latitude-field');
        const lngField = document.getElementById('longitude-field');
        if (latField) latField.value = '';
        if (lngField) lngField.value = '';
        
        // Clear location details
        if (this.locationDetailsInput) {
            this.locationDetailsInput.value = '';
        }
        
        // Hide status
        this.hideLocationStatus();
        this.hideError();
        
        // Clear localStorage
        localStorage.removeItem('hazardLatitude');
        localStorage.removeItem('hazardLongitude');
        localStorage.removeItem('hazardLocationDetails');
    }
    
    getLocationData() {
        if (!this.markedPosition || !this.locationDetailsInput) {
            return null;
        }
        
        return {
            latitude: this.markedPosition.latitude,
            longitude: this.markedPosition.longitude,
            details: this.locationDetailsInput.value.trim()
        };
    }
    
    isLocationComplete() {
        return this.validateLocation();
    }
}

// Add CSS animation for marker drop
const style = document.createElement('style');
style.textContent = `
    @keyframes dropIn {
        0% {
            transform: translate(-50%, -150%) scale(0.5);
            opacity: 0;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.2);
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
    
    .map-marker {
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
`;
document.head.appendChild(style);

// Initialize map location manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if map elements exist
    if (document.getElementById('google-map')) {
        window.mapLocationManager = new MapLocationManager();
        
        // Auto-save location details when input changes
        const locationDetails = document.getElementById('location-details');
        if (locationDetails) {
            locationDetails.addEventListener('input', () => {
                window.mapLocationManager.saveLocation();
            });
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MapLocationManager };
}
