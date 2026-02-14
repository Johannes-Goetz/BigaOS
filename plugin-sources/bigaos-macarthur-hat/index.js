/**
 * BigaOS MacArthur HAT Driver Plugin
 *
 * Reads sensor data from the MacArthur HAT on RPi 5.
 * Supports:
 *   - NMEA 2000 via CAN bus (candump + canboatjs)
 *   - ICM-20948 IMU via I2C (roll, pitch, yaw, magnetic heading)
 *
 * Data flow (CAN):
 *   MacArthur HAT -> SocketCAN (can0) -> candump -L
 *   -> parse CAN frame -> canboatjs FromPgn -> PGN handlers
 *   -> api.pushSensorValue() -> SensorMappingService -> Client
 *
 * Data flow (IMU):
 *   MacArthur HAT -> I2C bus 1 -> ICM-20948 registers
 *   -> raw accel/gyro/mag -> Madgwick AHRS fusion
 *   -> api.pushSensorValue() -> SensorMappingService -> Client
 */

const { CANConnection } = require('./can-connection');
const { PGNHandlers } = require('./pgn-handlers');
const { IMUConnection } = require('./imu-connection');
const { IMUFusion } = require('./imu-fusion');

let api = null;
let canConnection = null;
let pgnHandlers = null;
let fromPgn = null;
let imuConnection = null;
let imuFusion = null;
let healthCheckTimer = null;
let frameCount = 0;
let parsedCount = 0;
let lastFrameTime = 0;
let rawFrameCount = 0;
let imuSampleCount = 0;
let imuPushCount = 0;
let lastImuPush = 0;

// IMU push rate limiting (ms between pushes)
const IMU_PUSH_INTERVAL = 100; // 10Hz output

/**
 * Parse a raw CAN frame into a PGN message using canboatjs.
 */
function processFrame(frame) {
  if (!fromPgn) return;

  rawFrameCount++;

  const canId = frame.id;
  const src = canId & 0xFF;
  const pf = (canId >> 16) & 0xFF;
  const ps = (canId >> 8) & 0xFF;
  const dp = (canId >> 24) & 0x01;
  const priority = (canId >> 26) & 0x07;

  let pgn, dst;
  if (pf < 240) {
    pgn = (dp << 16) | (pf << 8);
    dst = ps;
  } else {
    pgn = (dp << 16) | (pf << 8) | ps;
    dst = 255;
  }

  // Format as Actisense N2K ASCII: timestamp,prio,pgn,src,dst,len,hex_bytes
  const dataHex = Array.from(frame.data).map(b => b.toString(16).padStart(2, '0')).join(',');
  const line = `${new Date().toISOString()},${priority},${pgn},${src},${dst},${frame.data.length},${dataHex}`;

  try {
    const parsed = fromPgn.parseString(line);

    if (parsed && parsed.fields) {
      frameCount++;
      lastFrameTime = Date.now();
      pgnHandlers.handle(parsed);
    }
  } catch (err) {
    if (rawFrameCount <= 5) {
      api.log(`Parse error for PGN ${pgn}: ${err.message}`);
    }
  }
}

/**
 * Process IMU data through fusion filter and push to streams.
 */
function processIMUData(data) {
  if (!imuFusion || !api) return;

  imuSampleCount++;

  const attitude = imuFusion.update(data);

  // Rate-limit pushes to 10Hz
  const now = Date.now();
  if (now - lastImuPush < IMU_PUSH_INTERVAL) return;
  lastImuPush = now;
  imuPushCount++;

  api.pushSensorValue('imu_roll', attitude.roll);
  api.pushSensorValue('imu_pitch', attitude.pitch);
  api.pushSensorValue('imu_heading', attitude.heading);
}

function startHealthCheck() {
  let lastCount = 0;
  let noDataAlertFired = false;
  let loggedDiag = false;

  healthCheckTimer = api.setInterval(() => {
    const now = Date.now();
    const receiving = frameCount > lastCount;
    lastCount = frameCount;

    // Log diagnostic info on first few health checks
    if (!loggedDiag && (rawFrameCount > 0 || imuSampleCount > 0)) {
      const pushed = pgnHandlers ? pgnHandlers.pushCount : 0;
      api.log(`Diagnostics: CAN ${rawFrameCount} raw/${frameCount} parsed/${pushed} pushed, IMU ${imuSampleCount} samples/${imuPushCount} pushed`);
      loggedDiag = true;
    }

    if (!canConnection.isConnected()) {
      api.log(`Health: CAN disconnected, waiting for reconnect...`);
      if (!noDataAlertFired) {
        api.triggerAlert({
          name: 'CAN Disconnected',
          message: 'MacArthur HAT: CAN bus disconnected',
          severity: 'warning',
        });
        noDataAlertFired = true;
      }
      return;
    }

    if (!receiving && lastFrameTime > 0 && (now - lastFrameTime) > 10000) {
      api.log(`Health: Connected but no data for ${Math.round((now - lastFrameTime) / 1000)}s`);
      if (!noDataAlertFired) {
        api.triggerAlert({
          name: 'No Data',
          message: 'MacArthur HAT: No data received for 10 seconds',
          severity: 'warning',
        });
        noDataAlertFired = true;
      }
    } else if (receiving) {
      if (noDataAlertFired) {
        api.log('Health: Data flow restored');
        noDataAlertFired = false;
      }
    }
  }, 5000);
}

module.exports = {
  async activate(pluginApi) {
    api = pluginApi;
    api.log('MacArthur HAT driver activating...');

    // ── CAN Bus Setup ───────────────────────────────────────────
    const canInterface = await api.getSetting('canInterface') || 'can0';
    const autoReconnect = await api.getSetting('autoReconnect') !== false;
    const reconnectInterval = await api.getSetting('reconnectInterval') || 5;
    const pgnFilter = await api.getSetting('pgnFilter') || '';

    api.log(`CAN config: interface=${canInterface}, autoReconnect=${autoReconnect}, reconnectInterval=${reconnectInterval}s`);

    // Initialize canboatjs PGN parser
    try {
      const { FromPgn } = require('@canboat/canboatjs');
      fromPgn = new FromPgn();
      api.log('canboatjs PGN parser initialized');
    } catch (err) {
      api.log(`ERROR: Failed to load canboatjs: ${err.message}`);
      api.triggerAlert({
        name: 'Parser Error',
        message: 'MacArthur HAT: Failed to load PGN parser library',
        severity: 'critical',
      });
      throw err;
    }

    pgnHandlers = new PGNHandlers(api, { pgnFilter });

    canConnection = new CANConnection({
      interface: canInterface,
      autoReconnect,
      reconnectInterval,
    });

    canConnection.on('connected', () => {
      api.log(`Connected to CAN interface: ${canInterface}`);
    });
    canConnection.on('disconnected', (code) => {
      api.log(`CAN connection lost (exit code: ${code})`);
    });
    canConnection.on('reconnecting', () => {
      api.log(`Reconnecting to ${canInterface}...`);
    });
    canConnection.on('error', (err) => {
      api.log(`CAN error: ${err.message}`);
    });
    canConnection.on('frame', processFrame);
    canConnection.connect();

    // ── IMU Setup (independent of CAN) ──────────────────────────
    const imuEnabled = await api.getSetting('imuEnabled') !== false;

    if (imuEnabled) {
      const imuAddress = await api.getSetting('imuI2CAddress') || '0x68';
      const imuPollRate = await api.getSetting('imuPollRate') || 50;

      api.log(`IMU config: address=${imuAddress}, pollRate=${imuPollRate}Hz`);

      imuFusion = new IMUFusion({
        sampleInterval: Math.round(1000 / imuPollRate),
      });

      imuConnection = new IMUConnection({
        address: imuAddress,
        pollRate: imuPollRate,
      });

      imuConnection.on('connected', () => {
        api.log('IMU connected: ICM-20948');
      });
      imuConnection.on('data', processIMUData);
      imuConnection.on('error', (err) => {
        api.log(`IMU error: ${err.message}`);
      });
      imuConnection.on('disconnected', () => {
        api.log('IMU disconnected');
      });

      // Connect IMU (errors won't kill the plugin)
      try {
        await imuConnection.connect();
      } catch (err) {
        api.log(`IMU initialization failed: ${err.message} (CAN bus continues)`);
        api.triggerAlert({
          name: 'IMU Error',
          message: `MacArthur HAT: IMU not available (${err.message})`,
          severity: 'warning',
        });
      }
    } else {
      api.log('IMU disabled by configuration');
    }

    // Start health monitoring
    startHealthCheck();

    api.log('MacArthur HAT driver active');
  },

  async deactivate() {
    if (api) {
      api.log('MacArthur HAT driver deactivating...');
    }

    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }

    if (imuConnection) {
      imuConnection.disconnect();
      imuConnection.removeAllListeners();
      imuConnection = null;
    }

    if (canConnection) {
      canConnection.disconnect();
      canConnection.removeAllListeners();
      canConnection = null;
    }

    fromPgn = null;
    pgnHandlers = null;
    imuFusion = null;
    frameCount = 0;
    parsedCount = 0;
    rawFrameCount = 0;
    lastFrameTime = 0;
    imuSampleCount = 0;
    imuPushCount = 0;
    lastImuPush = 0;
    api = null;
  },
};
