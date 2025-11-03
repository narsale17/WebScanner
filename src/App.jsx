import { useState, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./App.css";

function App() {
  const [balance] = useState(1000);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);

  const handleScanClick = async () => {
    try {
      setScanning(true);

      const codeReader = new BrowserMultiFormatReader();

      // 🔹 Ask camera permission and start stream
      const result = await codeReader.decodeOnceFromVideoDevice(
        undefined, // automatically pick the default camera
        videoRef.current
      );

      console.log("Scanned data:", result.text);
      validateQR(result.text);

      codeReader.reset(); // stop camera after scan
    } catch (error) {
      console.error("Error scanning:", error);
      alert("Failed to scan QR. Please allow camera permission.");
      setScanning(false);
    }
  };

  const validateQR = (data) => {
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
    setScanning(false);
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

      {/* 🔹 Video preview (only shown while scanning) */}
      {scanning && <video ref={videoRef} width="300" height="200" />}
    </div>
  );
}

export default App;
