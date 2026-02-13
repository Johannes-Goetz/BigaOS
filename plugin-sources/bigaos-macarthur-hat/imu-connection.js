/**
 * ICM-20948 IMU Connection
 *
 * Reads accelerometer, gyroscope, and magnetometer data from the
 * ICM-20948 9-axis IMU over I2C on Raspberry Pi.
 *
 * The ICM-20948 uses a bank-select register architecture (4 banks).
 * The magnetometer (AK09916) sits on an internal I2C bus and is
 * accessed via the ICM's I2C master passthrough registers.
 *
 * Data flow:
 *   I2C bus 1 -> ICM-20948 registers -> raw 16-bit samples
 *   -> scale to physical units -> emit 'data' event
 */

const { EventEmitter } = require('events');

// ICM-20948 I2C address (AD0 low = 0x68, AD0 high = 0x69)
const DEFAULT_ADDRESS = 0x68;

// ── Register Bank Select ────────────────────────────────────────
const REG_BANK_SEL = 0x7F;

// ── Bank 0 Registers ────────────────────────────────────────────
const WHO_AM_I = 0x00;           // Expected: 0xEA
const USER_CTRL = 0x03;
const PWR_MGMT_1 = 0x06;
const PWR_MGMT_2 = 0x07;
const INT_PIN_CFG = 0x0F;
const ACCEL_XOUT_H = 0x2D;      // 6 bytes: X_H, X_L, Y_H, Y_L, Z_H, Z_L
const GYRO_XOUT_H = 0x33;       // 6 bytes: X_H, X_L, Y_H, Y_L, Z_H, Z_L
const EXT_SLV_SENS_DATA_00 = 0x3B; // Magnetometer data read here (8 bytes)

// ── Bank 2 Registers (sensor config) ────────────────────────────
const GYRO_CONFIG_1 = 0x01;
const ACCEL_CONFIG = 0x14;

// ── Bank 3 Registers (I2C master for magnetometer) ──────────────
const I2C_MST_CTRL = 0x01;
const I2C_SLV0_ADDR = 0x03;
const I2C_SLV0_REG = 0x04;
const I2C_SLV0_CTRL = 0x05;
const I2C_SLV0_DO = 0x06;

// ── AK09916 Magnetometer (on internal I2C) ──────────────────────
const AK09916_ADDR = 0x0C;
const AK09916_WIA2 = 0x01;      // Expected: 0x09
const AK09916_CNTL2 = 0x31;     // Control register
const AK09916_ST1 = 0x10;       // Status 1 (data ready)
const AK09916_HXL = 0x11;       // Mag data start (6 bytes + ST2)

// ── Scale factors ───────────────────────────────────────────────
// Accelerometer: ±4g → 8192 LSB/g
const ACCEL_SCALE = 4;
const ACCEL_SENSITIVITY = 8192;

// Gyroscope: ±500°/s → 65.5 LSB/(°/s)
const GYRO_SCALE = 500;
const GYRO_SENSITIVITY = 65.5;
const DEG_TO_RAD = Math.PI / 180;

// Magnetometer: AK09916 0.15 µT/LSB
const MAG_SCALE = 0.15;

class IMUConnection extends EventEmitter {
  constructor(options = {}) {
    super();
    this.address = parseInt(options.address, 16) || DEFAULT_ADDRESS;
    this.busNumber = options.busNumber || 1;
    this.pollRate = options.pollRate || 50; // Hz
    this.bus = null;
    this.pollTimer = null;
    this.connected = false;
    this.errorCount = 0;
    this.maxErrors = 10;
  }

  async connect() {
    try {
      const i2cBus = require('i2c-bus');
      this.bus = await i2cBus.openPromisified(this.busNumber);

      // Verify WHO_AM_I
      const whoAmI = await this._readByte(0, WHO_AM_I);
      if (whoAmI !== 0xEA) {
        throw new Error(`WHO_AM_I mismatch: expected 0xEA, got 0x${whoAmI.toString(16)}`);
      }

      // Reset device
      await this._writeByte(0, PWR_MGMT_1, 0x80);
      await this._sleep(100);

      // Wake up, auto-select best clock
      await this._writeByte(0, PWR_MGMT_1, 0x01);
      await this._sleep(50);

      // Enable all accel and gyro axes
      await this._writeByte(0, PWR_MGMT_2, 0x00);

      // Configure accelerometer: ±4g, DLPF enabled
      await this._writeByte(2, ACCEL_CONFIG, 0x09); // ±4g, DLPF on, BW ~111Hz

      // Configure gyroscope: ±500°/s, DLPF enabled
      await this._writeByte(2, GYRO_CONFIG_1, 0x09); // ±500°/s, DLPF on, BW ~111Hz

      // Setup I2C master for magnetometer
      await this._setupMagnetometer();

      this.connected = true;
      this.errorCount = 0;
      this.emit('connected');

      // Start polling
      const interval = Math.round(1000 / this.pollRate);
      this.pollTimer = setInterval(() => this._poll(), interval);
    } catch (err) {
      this.emit('error', err);
    }
  }

  async _setupMagnetometer() {
    // Enable I2C master mode
    await this._writeByte(0, USER_CTRL, 0x20);

    // I2C master clock: 400kHz
    await this._writeByte(3, I2C_MST_CTRL, 0x07);

    // Reset magnetometer
    await this._writeMagReg(AK09916_CNTL2, 0x01);
    await this._sleep(100);

    // Set magnetometer to continuous mode 4 (100Hz)
    await this._writeMagReg(AK09916_CNTL2, 0x08);
    await this._sleep(10);

    // Configure SLV0 to read 8 bytes (ST1 + 6 data + ST2) from AK09916
    await this._writeByte(3, I2C_SLV0_ADDR, AK09916_ADDR | 0x80); // Read mode
    await this._writeByte(3, I2C_SLV0_REG, AK09916_HXL);
    await this._writeByte(3, I2C_SLV0_CTRL, 0x88); // Enable, 8 bytes
  }

  async _writeMagReg(reg, value) {
    // Write to magnetometer via I2C master
    await this._writeByte(3, I2C_SLV0_ADDR, AK09916_ADDR); // Write mode
    await this._writeByte(3, I2C_SLV0_REG, reg);
    await this._writeByte(3, I2C_SLV0_DO, value);
    await this._writeByte(3, I2C_SLV0_CTRL, 0x81); // Enable, 1 byte
    await this._sleep(10);
  }

  async _poll() {
    if (!this.bus || !this.connected) return;

    try {
      // Select bank 0 for sensor data reads
      await this.bus.writeByte(this.address, REG_BANK_SEL, 0x00);

      // Read accel (6 bytes) and gyro (6 bytes) in one burst
      const accelBuf = Buffer.alloc(6);
      await this.bus.readI2cBlock(this.address, ACCEL_XOUT_H, 6, accelBuf);

      const gyroBuf = Buffer.alloc(6);
      await this.bus.readI2cBlock(this.address, GYRO_XOUT_H, 6, gyroBuf);

      // Read magnetometer data from EXT_SLV_SENS registers (8 bytes)
      const magBuf = Buffer.alloc(8);
      await this.bus.readI2cBlock(this.address, EXT_SLV_SENS_DATA_00, 8, magBuf);

      // Parse accelerometer (g-force)
      const ax = accelBuf.readInt16BE(0) / ACCEL_SENSITIVITY;
      const ay = accelBuf.readInt16BE(2) / ACCEL_SENSITIVITY;
      const az = accelBuf.readInt16BE(4) / ACCEL_SENSITIVITY;

      // Parse gyroscope (rad/s)
      const gx = (gyroBuf.readInt16BE(0) / GYRO_SENSITIVITY) * DEG_TO_RAD;
      const gy = (gyroBuf.readInt16BE(2) / GYRO_SENSITIVITY) * DEG_TO_RAD;
      const gz = (gyroBuf.readInt16BE(4) / GYRO_SENSITIVITY) * DEG_TO_RAD;

      // Parse magnetometer (µT) - AK09916 is little-endian
      const mx = magBuf.readInt16LE(0) * MAG_SCALE;
      const my = magBuf.readInt16LE(2) * MAG_SCALE;
      const mz = magBuf.readInt16LE(4) * MAG_SCALE;

      this.errorCount = 0;
      this.emit('data', {
        accel: { x: ax, y: ay, z: az },   // g-force
        gyro: { x: gx, y: gy, z: gz },     // rad/s
        mag: { x: mx, y: my, z: mz },       // µT
        timestamp: Date.now(),
      });
    } catch (err) {
      this.errorCount++;
      if (this.errorCount <= 3) {
        this.emit('error', err);
      }
      if (this.errorCount >= this.maxErrors) {
        this.emit('error', new Error(`Too many I2C errors (${this.maxErrors}), stopping IMU polling`));
        this.disconnect();
      }
    }
  }

  async _readByte(bank, reg) {
    await this.bus.writeByte(this.address, REG_BANK_SEL, bank << 4);
    return this.bus.readByte(this.address, reg);
  }

  async _writeByte(bank, reg, value) {
    await this.bus.writeByte(this.address, REG_BANK_SEL, bank << 4);
    await this.bus.writeByte(this.address, reg, value);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.bus) {
      this.bus.closeSync();
      this.bus = null;
    }
    this.connected = false;
    this.emit('disconnected');
  }
}

module.exports = { IMUConnection };
