// Web Bluetooth client for connecting to the server app advertising the QR service
// Mirrors the Android BLE flow (service/characteristic UUIDs and handshake protocol)

const SERVICE_UUID = "0000abcd-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "0000cdef-0000-1000-8000-00805f9b34fb";

const STORAGE_KEY_PREFIX = "ble-remember-";

function getRememberedDeviceId(rememberKey) {
  try {
    if (!rememberKey) return null;
    return localStorage.getItem(STORAGE_KEY_PREFIX + rememberKey) || null;
  } catch (_) {
    return null;
  }
}

function rememberDeviceId(rememberKey, deviceId) {
  try {
    if (!rememberKey || !deviceId) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + rememberKey, deviceId);
  } catch (_) {
    // ignore
  }
}

export async function connectAndHandshake({ deviceName, transactionPossible, rememberKey }) {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth not supported in this browser or context.");
  }

  let device;
  let server;
  let service;
  let characteristic;

  try {
    // 1) Try auto-reconnect to previously granted device without chooser
    const savedId = getRememberedDeviceId(rememberKey || deviceName || "");
    if (savedId && navigator.bluetooth.getDevices) {
      const known = await navigator.bluetooth.getDevices();
      const match = known.find(d => d.id === savedId);
      if (match) {
        device = match;
      }
    }

    // 2) If no known device, ask user with as-narrow-as-possible filters
    if (!device) {
      const filters = [{ services: [SERVICE_UUID] }];
      if (deviceName && typeof deviceName === "string" && deviceName.trim().length > 0) {
        // Use exact name filter when provided to minimize chooser ambiguity
        filters.push({ name: deviceName });
      }

      device = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices: [SERVICE_UUID],
      });

      // Remember for auto-reconnect next time
      rememberDeviceId(rememberKey || deviceName || "", device.id);
    }

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


