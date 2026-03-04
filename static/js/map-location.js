/**
 * Simple Map Location Handler for Hazard Reporting System
 * Handles interactive map marking and location details
 */

class MapLocationManager {
  constructor() {
    this.mapElement = document.getElementById("simple-map");
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
    if (!this.mapElement) return;

    // Initialize map
    this.initializeMap();

    // Setup event listeners
    this.setupEventListeners();

    // Add mobile-specific features
    this.addMobileFeatures();
  }

  addMobileFeatures() {
    // Check if mobile device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    // Add photo capture option for both mobile and desktop
    this.addPhotoCaptureOption(isMobile);

    if (isMobile) {
      console.log("Mobile device detected - enabling mobile features");

      // Simplify map interface for mobile
      this.simplifyMobileMap();
    }
  }

  addPhotoCaptureOption(isMobile) {
    const mapContainer = document.querySelector(".map-container");
    if (mapContainer) {
      const photoSection = document.createElement("div");
      photoSection.innerHTML = `
        <div class="photo-capture-section" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #28a745;">
          <h4 style="margin: 0 0 10px 0; color: #28a745;">📸 ${isMobile ? "Location Photo (Mobile)" : "Location Photo Options"}</h4>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #6c757d;">
            ${isMobile ? "Take a photo of the hazard location:" : "Choose how to add a photo of the hazard location:"}
          </p>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            ${
              isMobile
                ? `
              <button type="button" onclick="mapLocationManager.capturePhoto()" 
                      class="btn btn-success btn-sm" style="flex: 1;">
                📷 Take Photo
              </button>
            `
                : `
              <button type="button" onclick="mapLocationManager.capturePhoto()" 
                      class="btn btn-success btn-sm" style="flex: 1;">
                📷 Use Camera
              </button>
            `
            }
            <button type="button" onclick="document.getElementById('photo-upload-input').click()" 
                    class="btn btn-primary btn-sm" style="flex: 1;">
              📁 Upload Photo
            </button>
          </div>
          <input type="file" id="photo-upload-input" accept="image/*" style="display: none;">
          <div id="photo-preview" style="margin-top: 10px;"></div>
        </div>
      `;
      mapContainer.appendChild(photoSection);

      // Handle file upload
      document
        .getElementById("photo-upload-input")
        .addEventListener("change", (e) => {
          this.handlePhotoUpload(e);
        });
    }
  }

  capturePhoto() {
    // Try to access camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: "environment" },
        })
        .then((stream) => {
          // Create video element for camera preview
          const video = document.createElement("video");
          video.srcObject = stream;
          video.autoplay = true;

          // Create modal for camera interface
          const modal = document.createElement("div");
          modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.9); z-index: 10000; display: flex; 
            flex-direction: column; align-items: center; justify-content: center;
          `;

          modal.innerHTML = `
            <div style="color: white; margin-bottom: 20px;">📸 Position camera and tap capture</div>
            <div style="position: relative;">
              <video id="camera-preview" style="max-width: 100%; max-height: 70vh; border-radius: 10px;"></video>
              <button onclick="this.parentElement.parentElement.remove()" 
                      style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; border-radius: 50%; width: 30px; height: 30px;">✕</button>
            </div>
            <div style="margin-top: 20px;">
              <button onclick="mapLocationManager.takePicture()" 
                      class="btn btn-success" style="padding: 15px 30px; font-size: 18px;">
                📸 Capture Photo
              </button>
            </div>
          `;

          document.body.appendChild(modal);
          document.getElementById("camera-preview").srcObject = stream;

          // Store stream for later cleanup
          this.cameraStream = stream;
        })
        .catch((err) => {
          console.error("Camera access denied:", err);
          alert("Camera access denied. Please use the upload option instead.");
        });
    } else {
      // Fallback to file input
      document.getElementById("photo-upload-input").click();
    }
  }

  takePicture() {
    const video = document.getElementById("camera-preview");
    if (video && this.cameraStream) {
      // Create canvas to capture image
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);

      // Convert to data URL
      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      // Store the photo data (unified)
      this.photoData = imageData;

      // Show preview
      const preview = document.getElementById("photo-preview");
      preview.innerHTML = `
        <img src="${imageData}" style="max-width: 100%; max-height: 150px; border-radius: 5px; margin-bottom: 5px;">
        <p style="margin: 0; font-size: 12px; color: #28a745;">✓ Photo captured successfully</p>
      `;

      // Clean up camera
      this.stopCamera();

      // Remove modal
      document.querySelector('[style*="position: fixed"]').remove();
    }
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById("photo-preview");
        preview.innerHTML = `
          <img src="${e.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 5px; margin-bottom: 5px;">
          <p style="margin: 0; font-size: 12px; color: #28a745;">✓ Photo uploaded successfully</p>
        `;

        // Store the photo data for form submission
        this.photoData = e.target.result;

        // Hide the regular camera capture button if it exists
        const captureBtn = document.getElementById("capture-map-btn");
        if (captureBtn) {
          captureBtn.style.display = "none";
        }
      };
      reader.readAsDataURL(file);
    }
  }

  getPhotoData() {
    return this.photoData || this.mobilePhotoData || null;
  }

  simplifyMobileMap() {
    // Hide screenshot capture button on mobile
    const captureBtn = document.getElementById("capture-map-btn");
    if (captureBtn) {
      captureBtn.style.display = "none";
    }

    // Add mobile-friendly instructions
    const instructions = document.createElement("div");
    instructions.innerHTML = `
      <div style="background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
        <p style="margin: 0; font-size: 13px; color: #1976d2;">
          📱 <strong>Mobile Mode:</strong> Your location will be automatically detected. 
          Take a photo of the hazard location for visual reference.
        </p>
      </div>
    `;

    const mapContainer = document.querySelector(".map-container");
    if (mapContainer) {
      mapContainer.insertBefore(instructions, mapContainer.firstChild);
    }
  }

  // Method to get mobile photo data for form submission
  getMobilePhotoData() {
    return this.mobilePhotoData || null;
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

    // Map click handler
    this.setupMapClickListener();
  }

  setupMapInteraction() {
    // Enable map interaction
    this.enableMapClicking();
  }

  enableMapClicking() {
    const mapElement = this.mapElement;
    if (mapElement) {
      mapElement.style.cursor = "pointer";
      mapElement.addEventListener("click", (e) => {
        e.preventDefault();
        this.showLocationPicker();
      });
    }
  }

  showLocationPicker() {
    const coords = this.getRandomCoordinates();
    this.markLocation(coords.lat, coords.lng);

    // Show confirmation
    if (this.mapElement) {
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 1000;
        font-size: 14px;
      `;
      notification.textContent = `Location set: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

      this.mapElement.appendChild(notification);

      // Remove notification after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }

  getRandomCoordinates() {
    // Return random coordinates around the school area
    const baseLat = 13.3809924;
    const baseLng = 121.1826176;

    return {
      lat: baseLat + (Math.random() - 0.5) * 0.01,
      lng: baseLng + (Math.random() - 0.5) * 0.01,
    };
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

    // Update map visual
    this.updateMapVisual();

    // Update form fields
    this.updateFormFields(latitude, longitude);

    // Validate complete location
    this.validateLocation();

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
      this.showError("Please click on the map to set location");
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

  updateMapVisual() {
    if (this.mapElement) {
      this.mapElement.style.background = `linear-gradient(135deg, #e8f5e8 0%, #f3e5f5 100%)`;
      this.mapElement.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; z-index: 10;">📍</div>
        <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(76, 175, 80, 0.9); padding: 8px 12px; border-radius: 4px; font-size: 12px;">
          <strong>Location Set</strong><br>
          <small>${this.markedPosition.latitude.toFixed(4)}, ${this.markedPosition.longitude.toFixed(4)}</small>
        </div>
      `;
    }
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

    // Reset map visual
    if (this.mapElement) {
      this.mapElement.style.background = "#f0f0f0";
      this.mapElement.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; z-index: 10;">🗺️</div>
        <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 8px 12px; border-radius: 4px; font-size: 12px;">
          <strong>Interactive Map</strong><br>
          <small>Click to set location</small>
        </div>
      `;
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

// Add CSS for map interactions
const style = document.createElement("style");
style.textContent = `
  #simple-map {
    transition: background 0.3s ease;
  }
  
  #simple-map:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
`;
document.head.appendChild(style);

// Initialize map location manager when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize if map elements exist
  if (document.getElementById("simple-map")) {
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

// Make it globally available for mobile features
window.mapLocationManager = new MapLocationManager();
