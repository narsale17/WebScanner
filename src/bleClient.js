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
    // 1) Try auto-reconnect to a previously remembered device id
    const savedKey = rememberKey || deviceName || "";
    const savedId = getRememberedDeviceId(savedKey);
    if (savedId && navigator.bluetooth.getDevices) {
      const known = await navigator.bluetooth.getDevices();
      // Prefer exact id
      device = known.find(d => d.id === savedId) || null;
      // If not found by id, try by name (if multiple, pick first available)
      if (!device && deviceName) {
        device = known.find(d => (d.name || "").toLowerCase() === deviceName.toLowerCase()) || null;
      }
    }

    // 2) If still no device, show chooser with narrowest filters (combine constraints when possible)
    if (!device) {
      const hasName = Boolean(deviceName && typeof deviceName === "string" && deviceName.trim().length > 0);
      const filters = hasName
        ? [{ services: [SERVICE_UUID], name: deviceName }]
        : [{ services: [SERVICE_UUID] }];
      device = await navigator.bluetooth.requestDevice({ filters, optionalServices: [SERVICE_UUID] });
      rememberDeviceId(savedKey, device.id); // overwrite with latest selection (most recent)
    }

    // 3) Connect, if fails forget and retry via chooser once
    try {
      server = await device.gatt.connect();
    } catch (e) {
      // stale device permission or unreachable, prompt chooser
      rememberDeviceId(savedKey, "");
      const hasName = Boolean(deviceName && typeof deviceName === "string" && deviceName.trim().length > 0);
      const filters = hasName
        ? [{ services: [SERVICE_UUID], name: deviceName }]
        : [{ services: [SERVICE_UUID] }];
      const newDev = await navigator.bluetooth.requestDevice({ filters, optionalServices: [SERVICE_UUID] });
      rememberDeviceId(savedKey, newDev.id);
      device = newDev;
      server = await device.gatt.connect();
    }
    service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    // Enable notifications
    await characteristic.startNotifications();

    // Wait for the server notification with the result ("okay true/false"). Add a timeout fallback.
    const notificationPromise = new Promise((resolve, reject) => {
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

      // Timeout after 10s to avoid UI hanging in processing state
      const timeoutId = setTimeout(() => {
        characteristic.removeEventListener("characteristicvaluechanged", onChanged);
        reject(new Error("BLE response timeout"));
      }, 10000);

      // Ensure we clear timeout when resolved
      const originalResolve = resolve;
      resolve = (val) => { clearTimeout(timeoutId); originalResolve(val); };
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


