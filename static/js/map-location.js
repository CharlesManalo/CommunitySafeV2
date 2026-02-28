/**
 * Google Maps Location Handler for Hazard Reporting System
 * Handles interactive map marking and location details
 */

class MapLocationManager {
  constructor() {
    this.mapFrame = document.getElementById("google-map");
    this.latitudeSpan = document.getElementById("latitude");
    this.longitudeSpan = document.getElementById("longitude");
    this.locationDetailsInput = document.getElementById("location-details");
    this.locationStatus = document.getElementById("location-status");
    this.locationError = document.getElementById("location-error");

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
      this.locationDetailsInput.addEventListener("input", () =>
        this.validateLocation(),
      );
      this.locationDetailsInput.addEventListener("blur", () =>
        this.validateLocation(),
      );
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
    // Create a permanent center marker
    this.createCenterMarker();

    // Add instruction click handler
    const instructions = document.querySelector(".map-instructions");
    if (instructions) {
      instructions.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showMapHelp();
      });
    }

    // Add map movement detection
    this.detectMapMovement();
  }

  createCenterMarker() {
    // Create a permanent center marker
    const marker = document.createElement("div");
    marker.className = "center-map-marker";
    marker.innerHTML = "📍";
    marker.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            z-index: 1000;
            pointer-events: none;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        `;

    const mapContainer = document.querySelector(".map-container");
    if (mapContainer) {
      mapContainer.style.position = "relative";
      mapContainer.appendChild(marker);
    }

    // Initialize with center coordinates
    this.markCenterLocation();
  }

  detectMapMovement() {
    // Since we're using iframe, we'll use a button approach
    this.addMapControls();
  }

  addMapControls() {
    const mapContainer = document.querySelector(".map-container");
    if (!mapContainer) return;

    // Create control panel
    const controls = document.createElement("div");
    controls.className = "map-controls";
    controls.innerHTML = `
            <div class="control-row">
                <button id="mark-location-btn" class="btn btn-primary btn-sm">
                    📍 Mark This Location
                </button>
            </div>
            <div class="control-row">
                <small class="text-muted">Move the map to position the marker, then click "Mark This Location"</small>
            </div>
        `;
    controls.style.cssText = `
            position: relative;
            margin-top: 15px;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            width: 100%;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
        `;

    mapContainer.appendChild(controls);

    // Add event listener to mark button
    document
      .getElementById("mark-location-btn")
      .addEventListener("click", () => {
        this.markCenterLocation();
      });
  }

  markCenterLocation() {
    // Use the center coordinates from your embed URL
    const centerLat = 13.3809924;
    const centerLng = 121.1826176;

    // In a real implementation with Google Maps API, you'd get the actual center
    // For now, we'll simulate with the center coordinates
    this.markLocation(centerLat, centerLng);
  }

  markLocation(latitude, longitude) {
    this.markedPosition = {
      latitude: latitude,
      longitude: longitude,
    };

    // Update coordinate display
    this.latitudeSpan.textContent = latitude.toFixed(6);
    this.longitudeSpan.textContent = longitude.toFixed(6);

    // Show success status
    this.showLocationStatus();

    // Update form fields
    this.updateFormFields(latitude, longitude);

    // Validate complete location
    this.validateLocation();

    // Update button state
    const markBtn = document.getElementById("mark-location-btn");
    if (markBtn) {
      markBtn.textContent = "✅ Location Marked";
      markBtn.classList.remove("btn-primary");
      markBtn.classList.add("btn-success");
    }

    console.log("Location marked:", latitude, longitude);
  }

  showLocationStatus() {
    if (this.locationStatus) {
      this.locationStatus.style.display = "block";
    }
    this.hideError();
  }

  hideLocationStatus() {
    if (this.locationStatus) {
      this.locationStatus.style.display = "none";
    }
  }

  showError(message) {
    if (this.locationError) {
      this.locationError.innerHTML = `<p class="text-error">❌ ${message}</p>`;
      this.locationError.style.display = "block";
    }
    this.hideLocationStatus();
  }

  hideError() {
    if (this.locationError) {
      this.locationError.style.display = "none";
    }
  }

  validateLocation() {
    const hasCoordinates = this.markedPosition !== null;
    const hasDetails =
      this.locationDetailsInput &&
      this.locationDetailsInput.value.trim().length > 0;

    if (hasCoordinates && hasDetails) {
      this.showLocationStatus();
      return true;
    } else if (!hasCoordinates && hasDetails) {
      this.showError("Please mark the location on the map");
      return false;
    } else if (hasCoordinates && !hasDetails) {
      this.showError("Please provide location details");
      return false;
    } else {
      this.hideLocationStatus();
      this.hideError();
      return false;
    }
  }

  updateFormFields(latitude, longitude) {
    // Create hidden form fields if they don't exist
    let latField = document.getElementById("latitude-field");
    let lngField = document.getElementById("longitude-field");

    if (!latField) {
      latField = document.createElement("input");
      latField.type = "hidden";
      latField.id = "latitude-field";
      latField.name = "latitude";
      document.body.appendChild(latField);
    }

    if (!lngField) {
      lngField = document.createElement("input");
      lngField.type = "hidden";
      lngField.id = "longitude-field";
      lngField.name = "longitude";
      document.body.appendChild(lngField);
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
    alert(
      "Click anywhere on the map to mark the hazard location. You can zoom in/out for better accuracy.",
    );
  }

  loadSavedLocation() {
    // Load any previously saved location from localStorage
    const savedLat = localStorage.getItem("hazardLatitude");
    const savedLng = localStorage.getItem("hazardLongitude");
    const savedDetails = localStorage.getItem("hazardLocationDetails");

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
      localStorage.setItem("hazardLatitude", this.markedPosition.latitude);
      localStorage.setItem("hazardLongitude", this.markedPosition.longitude);
    }
    if (this.locationDetailsInput) {
      localStorage.setItem(
        "hazardLocationDetails",
        this.locationDetailsInput.value,
      );
    }
  }

  clearLocation() {
    // Clear marked location
    this.markedPosition = null;
    this.latitudeSpan.textContent = "--";
    this.longitudeSpan.textContent = "--";

    // Remove marker
    const marker = document.querySelector(".map-marker");
    if (marker) {
      marker.remove();
    }

    // Clear form fields
    const latField = document.getElementById("latitude-field");
    const lngField = document.getElementById("longitude-field");
    if (latField) latField.value = "";
    if (lngField) lngField.value = "";

    // Clear location details
    if (this.locationDetailsInput) {
      this.locationDetailsInput.value = "";
    }

    // Hide status
    this.hideLocationStatus();
    this.hideError();

    // Clear localStorage
    localStorage.removeItem("hazardLatitude");
    localStorage.removeItem("hazardLongitude");
    localStorage.removeItem("hazardLocationDetails");
  }

  getLocationData() {
    if (!this.markedPosition || !this.locationDetailsInput) {
      return null;
    }

    return {
      latitude: this.markedPosition.latitude,
      longitude: this.markedPosition.longitude,
      details: this.locationDetailsInput.value.trim(),
    };
  }

  isLocationComplete() {
    return this.validateLocation();
  }
}

// Add CSS animation for marker drop
const style = document.createElement("style");
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
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize if map elements exist
  if (document.getElementById("google-map")) {
    window.mapLocationManager = new MapLocationManager();

    // Auto-save location details when input changes
    const locationDetails = document.getElementById("location-details");
    if (locationDetails) {
      locationDetails.addEventListener("input", () => {
        window.mapLocationManager.saveLocation();
      });
    }
  }
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MapLocationManager };
}
