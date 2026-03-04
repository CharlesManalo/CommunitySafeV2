// Enhanced Map Location with Automatic Screenshot
class MapLocationManager {
  constructor() {
    this.map = null;
    this.marker = null;
    this.userLocation = null;
    this.isCapturing = false;
  }

  async init() {
    try {
      // Initialize map
      this.map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 13.3809924, lng: 121.1826176 }, // Default to OMNHS location
        zoom: 17,
        mapTypeId: "roadmap",
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      // Get user location
      await this.getUserLocation();

      // Add click listener for marking location
      this.map.addListener("click", (event) => {
        this.markLocation(event.latLng);
      });

      // Add map controls
      this.addMapControls();

      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
      this.showError("Failed to load map. Please refresh the page.");
    }
  }

  async getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          // Add marker for user's location
          new google.maps.Marker({
            position: this.userLocation,
            map: this.map,
            title: "Your Location",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 0.8,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          // Center map on user's location
          this.map.setCenter(this.userLocation);
        },
        (error) => {
          console.error("Geolocation error:", error);
          this.showError(
            "Unable to get your location. Please enable location services.",
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        },
      );
    } else {
      this.showError("Geolocation is not supported by your browser.");
    }
  }

  markLocation(latLng) {
    // Remove existing marker
    if (this.marker) {
      this.marker.setMap(null);
    }

    // Add new marker
    this.marker = new google.maps.Marker({
      position: latLng,
      map: this.map,
      title: "Hazard Location",
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    // Update form fields
    document.getElementById("latitude-field").value = latLng.lat();
    document.getElementById("longitude-field").value = latLng.lng();

    // Show success message
    this.showSuccess("Location marked successfully!");

    // Auto-screenshot the map with pin
    setTimeout(() => {
      this.captureMapScreenshot();
    }, 1000); // Wait for marker animation
  }

  async captureMapScreenshot() {
    if (this.isCapturing) return;

    this.isCapturing = true;
    const btn = document.getElementById("mark-location-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = "📸 Capturing Map...";
    btn.disabled = true;

    try {
      // Load html2canvas if not already loaded
      if (typeof html2canvas === "undefined") {
        await this.loadHtml2Canvas();
      }

      // Capture the map container
      const mapContainer = document.getElementById("map");
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        width: mapContainer.offsetWidth,
        height: mapContainer.offsetHeight,
        backgroundColor: "#ffffff",
      });

      // Convert to blob and then to base64
      canvas.toBlob(async (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          this.saveMapScreenshot(base64data);
        };
        reader.readAsDataURL(blob);
      }, "image/png");
    } catch (error) {
      console.error("Screenshot failed:", error);
      this.showError("Failed to capture map screenshot");
    } finally {
      this.isCapturing = false;
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  async loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  saveMapScreenshot(base64data) {
    // Create or update hidden input for map screenshot
    let mapScreenshotInput = document.getElementById("map-screenshot");
    if (!mapScreenshotInput) {
      mapScreenshotInput = document.createElement("input");
      mapScreenshotInput.type = "hidden";
      mapScreenshotInput.id = "map-screenshot";
      mapScreenshotInput.name = "map_screenshot";
      document.body.appendChild(mapScreenshotInput);
    }

    mapScreenshotInput.value = base64data;

    // Show success message
    this.showSuccess("Map screenshot captured and saved!");

    // Show preview
    this.showScreenshotPreview(base64data);
  }

  showScreenshotPreview(base64data) {
    // Create or update preview modal
    let modal = document.getElementById("screenshot-preview");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "screenshot-preview";
      modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

      const content = document.createElement("div");
      content.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 80%;
                max-height: 80%;
                overflow: auto;
                text-align: center;
            `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Close on click
      modal.addEventListener("click", () => {
        modal.style.display = "none";
      });
    }

    const content = modal.querySelector("div");
    content.innerHTML = `
            <h3>📸 Map Screenshot Captured</h3>
            <img src="${base64data}" style="max-width: 100%; border-radius: 4px; margin: 10px 0; border: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px;">This map screenshot will be saved with your report for admin review.</p>
            <button onclick="this.closest('#screenshot-preview').style.display='none'" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;

    modal.style.display = "flex";

    // Auto-hide after 3 seconds
    setTimeout(() => {
      modal.style.display = "none";
    }, 3000);
  }

  addMapControls() {
    // Create custom controls container
    const controlsDiv = document.createElement("div");
    controlsDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 1000;
        `;

    // Add "Mark Location" button
    const markBtn = document.createElement("button");
    markBtn.id = "mark-location-btn";
    markBtn.innerHTML = "📍 Mark This Location";
    markBtn.style.cssText = `
            display: block;
            width: 100%;
            padding: 8px 16px;
            margin-bottom: 8px;
            background: #4285F4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        `;
    markBtn.addEventListener("click", () => {
      // Get map center and mark it
      const center = this.map.getCenter();
      this.markLocation(center);
    });

    // Add "Clear Marker" button
    const clearBtn = document.createElement("button");
    clearBtn.innerHTML = "🗑️ Clear Marker";
    clearBtn.style.cssText = `
            display: block;
            width: 100%;
            padding: 8px 16px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        `;
    clearBtn.addEventListener("click", () => {
      this.clearMarker();
    });

    controlsDiv.appendChild(markBtn);
    controlsDiv.appendChild(clearBtn);

    // Add controls to map
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlsDiv);
  }

  clearMarker() {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }

    // Clear form fields
    document.getElementById("latitude-field").value = "";
    document.getElementById("longitude-field").value = "";

    // Clear map screenshot
    const mapScreenshotInput = document.getElementById("map-screenshot");
    if (mapScreenshotInput) {
      mapScreenshotInput.value = "";
    }

    this.showSuccess("Marker cleared");
  }

  showSuccess(message) {
    const successDiv = document.getElementById("location-success");
    const errorDiv = document.getElementById("location-error");

    successDiv.style.display = "block";
    successDiv.innerHTML = `<p class="text-success">✅ ${message}</p>`;
    errorDiv.style.display = "none";
  }

  showError(message) {
    const successDiv = document.getElementById("location-success");
    const errorDiv = document.getElementById("location-error");

    errorDiv.style.display = "block";
    errorDiv.innerHTML = `<p class="text-error">❌ ${message}</p>`;
    successDiv.style.display = "none";
  }
}

// Initialize map when page loads
let mapManager;

function initMap() {
  mapManager = new MapLocationManager();
  mapManager.init();
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  if (typeof google !== "undefined" && google.maps) {
    initMap();
  }
});
