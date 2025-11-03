import { useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./App.css";

function App() {
  const [balance] = useState(1000);
  const [scanning, setScanning] = useState(false);

  const handleScanClick = async () => {
    setScanning(true);
    try {
      const codeReader = new BrowserMultiFormatReader();

      // Ask for camera access
      const videoInputDevices = await codeReader.listVideoInputDevices();
      const selectedDeviceId = videoInputDevices[0]?.deviceId;

      // Start scanning
      const result = await codeReader.decodeOnceFromVideoDevice(
        selectedDeviceId,
        "video"
      );

      console.log("Scanned data:", result.text);
      validateQR(result.text);
    } catch (err) {
      console.error("Error scanning:", err);
      alert("Failed to scan QR code.");
    } finally {
      setScanning(false);
    }
  };

  const validateQR = (data) => {
    try {
      const obj = JSON.parse(data); // expect JSON like {"name":"...","token":"...","BLE":true}

      // ✅ Example validation
      if (obj.token && obj.name && obj.totalamt && obj.BLE) {
        alert(`Valid QR! User: ${obj.name}, Amount: ${obj.totalamt}`);
      } else {
        alert("Invalid QR format — missing fields.");
      }
    } catch (e) {
      alert("Invalid QR — not JSON or not matching required data.");
    }
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

      {/* Camera video feed (only visible while scanning) */}
      {scanning && <video id="video" width="300" height="200" />}
    </div>
  );
}

export default App;
