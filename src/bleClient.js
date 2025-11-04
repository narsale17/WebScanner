// Web Bluetooth client for connecting to the server app advertising the QR service
// Mirrors the Android BLE flow (service/characteristic UUIDs and handshake protocol)

const SERVICE_UUID = "0000abcd-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "0000cdef-0000-1000-8000-00805f9b34fb";

export async function connectAndHandshake({ deviceName, transactionPossible }) {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth not supported in this browser or context.");
  }

  let device;
  let server;
  let service;
  let characteristic;

  try {
    // Request device filtered by our service UUID (and name if provided)
    const filters = [{ services: [SERVICE_UUID] }];
    if (deviceName && typeof deviceName === "string" && deviceName.trim().length > 0) {
      filters.push({ name: deviceName });
    }

    device = await navigator.bluetooth.requestDevice({
      filters,
      optionalServices: [SERVICE_UUID],
    });

    server = await device.gatt.connect();
    service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    // Enable notifications
    await characteristic.startNotifications();

    // Wait for the server notification with the result ("okay true/false")
    const notificationPromise = new Promise((resolve) => {
      const onChanged = (event) => {
        try {
          const value = event.target.value;
          const decoder = new TextDecoder("utf-8");
          const msg = decoder.decode(value);
          if (typeof msg === "string" && msg.toLowerCase().startsWith("okay ")) {
            characteristic.removeEventListener("characteristicvaluechanged", onChanged);
            resolve(msg.trim());
          }
        } catch (_) {
          // ignore and continue listening
        }
      };
      characteristic.addEventListener("characteristicvaluechanged", onChanged);
    });

    // Write transactionPossible as the payload ("true" or "false")
    const encoder = new TextEncoder();
    const payload = encoder.encode(String(Boolean(transactionPossible)));
    await characteristic.writeValue(payload);

    const response = await notificationPromise; // "okay true" | "okay false"
    return { response };
  } finally {
    try { await characteristic?.stopNotifications(); } catch (_) {}
    try { await server?.disconnect(); } catch (_) {}
  }
}

export const BLE_UUIDS = { SERVICE_UUID, CHARACTERISTIC_UUID };


