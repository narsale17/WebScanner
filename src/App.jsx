import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./App.css";

function App() {
  const [balance] = useState(1000);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    if (scanning && videoRef.current) {
      let codeReader = null;
      let ensurePlay = null;
      let playTimer = null;
      let isScanning = true; // Flag to prevent multiple scans

      // Wait for video element to be ready, then start scanning
      const startScanning = async () => {
        try {
          const video = videoRef.current;
          if (!video) {
            throw new Error("Video element not found");
          }

          // Ensure video plays when stream is attached
          ensurePlay = () => {
            if (video.srcObject && video.paused) {
              video.play().catch(err => {
                console.error("Error playing video:", err);
              });
            }
          };

          // Listen for when stream is attached
          video.addEventListener('loadedmetadata', ensurePlay);
          video.addEventListener('canplay', ensurePlay);

          // Create code reader
          codeReader = new BrowserMultiFormatReader();
          codeReaderRef.current = codeReader;

          // Start continuous scanning - ZXing will handle getting the stream and attaching it
          codeReader.decodeFromVideoDevice(
            undefined, // automatically pick the default camera
            video,
            async (result, error) => {
              // Only process if still scanning and haven't already scanned
              if (!isScanning) return;
              
              if (result) {
                isScanning = false; // Prevent multiple scans
                console.log("Scanned data:", result.text);
                
                // Stop scanning immediately
                if (codeReaderRef.current) {
                  codeReaderRef.current.reset();
                  codeReaderRef.current = null;
                }
                
                // Stop video stream
                if (video && video.srcObject) {
                  const tracks = video.srcObject.getTracks();
                  tracks.forEach(track => track.stop());
                  video.srcObject = null;
                }
                
                // Show popup first, then close camera
                await validateQR(result.text);
              }
              if (error && error.name !== 'NotFoundException') {
                // NotFoundException is normal when no QR code is detected yet
                console.error("Scan error:", error);
              }
            }
          );

          // Try to play after a short delay (in case stream was already attached)
          playTimer = setTimeout(ensurePlay, 500);
        } catch (error) {
          console.error("Error scanning:", error);
          alert("Failed to scan QR. Please allow camera permission.");
          setScanning(false);
        }
      };

      // Small delay to ensure video element is fully mounted and rendered
      const timer = setTimeout(() => {
        startScanning();
      }, 200);

      return () => {
        isScanning = false; // Stop scanning flag
        clearTimeout(timer);
        if (playTimer) {
          clearTimeout(playTimer);
        }
        // Cleanup on unmount
        const video = videoRef.current;
        if (video && ensurePlay) {
          video.removeEventListener('loadedmetadata', ensurePlay);
          video.removeEventListener('canplay', ensurePlay);
        }
        if (codeReaderRef.current) {
          codeReaderRef.current.reset();
          codeReaderRef.current = null;
        }
        if (video && video.srcObject) {
          const tracks = video.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          video.srcObject = null;
        }
      };
    }
  }, [scanning]);

  const handleScanClick = () => {
    setScanning(true);
  };

  const handleStopScan = () => {
    // Stop the code reader
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    // Stop any active video streams
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const validateQR = async (data) => {
    // Show popup first
    return new Promise((resolve) => {
      try {
        const obj = JSON.parse(data);
        if (obj.name && obj.token && obj.totalamt) {
          alert(`✅ Valid QR for ${obj.name} | Amount: ₹${obj.totalamt}`);
        } else {
          alert("❌ Invalid QR structure.");
        }
      } catch (e) {
        alert("❌ Invalid QR — not in JSON format.");
      }
      
      // Close camera after popup is shown
      // Small delay to ensure alert is visible
      setTimeout(() => {
        setScanning(false);
        resolve();
      }, 100);
    });
  };

  return (
    <div className="app-container">
      <div className="balance-display">
        <span className="balance-label">Total Balance:</span>
        <span className="balance-value">{balance}</span>
      </div>

      <div className="center-content">
        <button className="scan-button" onClick={handleScanClick}>
          Scan QR and Pay
        </button>
      </div>

      {/* 🔹 Video preview (only shown while scanning) - Fullscreen */}
      {scanning && (
        <div className="scanner-overlay">
          <video 
            ref={videoRef} 
            className="scanner-video" 
            autoPlay 
            playsInline 
            muted 
          />
          <button className="close-scanner-button" onClick={handleStopScan}>
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
