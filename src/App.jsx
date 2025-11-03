import { useState } from 'react'
import './App.css'

function App() {
  const [balance] = useState(1000)

  /*const handleScanClick = () => {
    // Placeholder for QR scan functionality
    alert('QR Scanner will be implemented here')
  }*/

  const handleScanClick = async () => {
    try {
      // Ask for Bluetooth permission (this opens the system dialog on Android Chrome)
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      console.log("Bluetooth device selected:", device);
      alert(`Bluetooth device selected: ${device.name || "Unnamed device"}`);
    } catch (error) {
      console.error("Bluetooth error:", error);
      alert("Bluetooth access denied or no device selected.");
    }
  };


  return (
    <div className="app-container">
      <div className="balance-display">
        <span className="balance-label">Total Balance:</span>
        <span className="balance-value">{balance}</span>
      </div>
      
      <div className="center-content">
        <button 
          className="scan-button"
          onClick={handleScanClick}
        >
          Scan QR and Pay
        </button>
      </div>
    </div>
  )
}

export default App

