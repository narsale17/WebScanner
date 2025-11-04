import { useState, useRef, useEffect } from "react";
import { connectAndHandshake } from "./bleClient";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./App.css";

function App() {
  const [balance, setBalance] = useState(1000);
  const [scanning, setScanning] = useState(false);
  const [receipt, setReceipt] = useState(null); // { success, amount, name, txnId, timestamp }
  const [processing, setProcessing] = useState(false);
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

          // Single-shot scan for reliability
          try {
            const result = await codeReader.decodeOnceFromVideoDevice(
              undefined, // default camera
              video
            );
            if (result && isScanning) {
              isScanning = false;
              console.log("Scanned data:", result.text);
              await validateQR(result.text);
            }
          } finally {
            // Always cleanup reader and stream
            if (codeReaderRef.current) {
              codeReaderRef.current.reset();
              codeReaderRef.current = null;
            }
            if (video && video.srcObject) {
              const tracks = video.srcObject.getTracks();
              tracks.forEach(track => track.stop());
              video.srcObject = null;
            }
          }

          // Try to play after a short delay (in case stream was already attached)
          playTimer = setTimeout(ensurePlay, 500);
        } catch (error) {
          console.error("Error scanning:", error);
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
    try {
      const obj = JSON.parse(data);
      const amount = Number(obj?.totalamt);
      if (!Number.isFinite(amount)) {
        setScanning(false);
        // Show failure receipt for invalid amount
        setReceipt({
          success: false,
          amount: 0,
          name: obj?.name || "",
          txnId: Math.random().toString(16).slice(2, 10),
          timestamp: Date.now(),
        });
        return;
      }

      const deviceName = obj?.name || "";
      const serverHasBle = Boolean(obj?.BLE);
      const transactionPossible = balance >= amount;

      // Close camera view now (no popups)
      setScanning(false);

      // If the server advertises BLE and Web Bluetooth is available, attempt the handshake.
      // We pass a rememberKey so subsequent connections can auto-reconnect without chooser.
      if (serverHasBle && navigator.bluetooth) {
        try {
          setProcessing(true);
          const { response } = await connectAndHandshake({
            deviceName,
            transactionPossible,
            rememberKey: obj?.token || deviceName || "",
          });

          const ok = typeof response === "string" && response.toLowerCase().startsWith("okay ");
          const accepted = ok && response.toLowerCase().includes("true");

          if (accepted) {
            // Deduct amount locally like Android code
            setBalance((prev) => Math.max(0, prev - amount));
          }

          // Show receipt overlay
          setReceipt({
            success: accepted,
            amount,
            name: deviceName,
            txnId: Math.random().toString(16).slice(2, 10),
            timestamp: Date.now(),
          });
          setProcessing(false);
        } catch (e) {
          // BLE handshake failed — show failure receipt
          setReceipt({
            success: false,
            amount,
            name: deviceName,
            txnId: Math.random().toString(16).slice(2, 10),
            timestamp: Date.now(),
          });
          setProcessing(false);
        }
      } else {
        // BLE not available/advertised — treat as failure to preserve two-sided consistency
        setReceipt({
          success: false,
          amount,
          name: deviceName,
          txnId: Math.random().toString(16).slice(2, 10),
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      setScanning(false);
      // Show failure receipt for parse error
      setReceipt({
        success: false,
        amount: 0,
        name: "",
        txnId: Math.random().toString(16).slice(2, 10),
        timestamp: Date.now(),
      });
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

      {/* 🔹 Processing overlay (BLE handshake) */}
      {processing && (
        <div className="scanner-overlay" style={{ background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#fff", fontSize: 18 }}>Processing via Bluetooth…</div>
        </div>
      )}

      {/* 🔹 Receipt overlay */}
      {receipt && (
        <div className="scanner-overlay" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div style={{
            background: "#fff",
            color: "#333",
            padding: 24,
            borderRadius: 16,
            width: "min(90vw, 420px)",
            boxShadow: "0 10px 35px rgba(0,0,0,0.4)",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {receipt.success ? "Payment Successful" : "Payment Failed"}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: receipt.success ? "#16a34a" : "#dc2626", marginBottom: 8 }}>
              ₹{receipt.amount}
            </div>
            <div style={{ marginBottom: 4 }}>Name: {receipt.name || ""}</div>
            <div style={{ marginBottom: 4 }}>Txn: {receipt.txnId}</div>
            <div style={{ marginBottom: 12 }}>{new Date(receipt.timestamp).toLocaleString()}</div>
            <div style={{ marginBottom: 16, fontWeight: 600 }}>Balance: ₹{balance}</div>
            <button
              className="close-scanner-button"
              onClick={() => setReceipt(null)}
              style={{ position: "static" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
