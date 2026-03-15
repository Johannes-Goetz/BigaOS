/**
 * IMU Calibration Module
 *
 * Handles gyroscope bias, magnetometer hard-iron/soft-iron, and
 * mounting offset calibration for the ICM-20948 IMU.
 *
 * Calibration data is persisted via plugin settings and loaded on startup.
 * If no calibration exists on first run, gyro bias and mounting offset
 * are auto-calibrated (magnetometer requires user-initiated rotation).
 */

// Number of samples for gyro bias calibration (~2s at 50Hz)
const GYRO_CAL_SAMPLES = 100;

// Number of samples for mounting offset (~1s at 50Hz)
const MOUNT_CAL_SAMPLES = 50;

// Max accelerometer variance (g²) to accept gyro calibration (must be stationary)
const MOTION_THRESHOLD = 0.01;

class IMUCalibration {
  constructor() {
    this.gyroBias = { x: 0, y: 0, z: 0 };
    this.magHardIron = { x: 0, y: 0, z: 0 };
    this.magSoftIron = { x: 1, y: 1, z: 1 };
    this.mountingOffset = { roll: 0, pitch: 0, heading: 0 };
    this.calibrated = false;
    this.status = 'idle'; // idle | calibrating_gyro | calibrating_mount | calibrating_mag | complete
    this.progress = 0;
    this.magSamples = 0;
  }

  /**
   * Load calibration data from plugin settings.
   * Returns true if valid calibration was found.
   */
  async load(api) {
    try {
      const data = await api.getSetting('imuCalibration');
      if (!data || data.version !== 1) return false;

      if (data.gyroBias) this.gyroBias = data.gyroBias;
      if (data.magHardIron) this.magHardIron = data.magHardIron;
      if (data.magSoftIron) this.magSoftIron = data.magSoftIron;
      if (data.mountingOffset) this.mountingOffset = data.mountingOffset;
      this.calibrated = true;
      this.status = 'complete';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save calibration data to plugin settings.
   */
  async save(api) {
    await api.setSetting('imuCalibration', {
      version: 1,
      timestamp: new Date().toISOString(),
      gyroBias: this.gyroBias,
      magHardIron: this.magHardIron,
      magSoftIron: this.magSoftIron,
      mountingOffset: this.mountingOffset,
    });
  }

  /**
   * Calibrate gyroscope bias. Device must be stationary.
   * Collects samples and averages the gyro readings.
   */
  calibrateGyro(imuConnection) {
    return new Promise((resolve, reject) => {
      this.status = 'calibrating_gyro';
      this.progress = 0;

      const samples = [];
      const accelSamples = [];

      const onData = (data) => {
        samples.push({ x: data.gyro.x, y: data.gyro.y, z: data.gyro.z });
        accelSamples.push({ x: data.accel.x, y: data.accel.y, z: data.accel.z });
        this.progress = Math.round((samples.length / GYRO_CAL_SAMPLES) * 100);

        if (samples.length >= GYRO_CAL_SAMPLES) {
          imuConnection.removeListener('data', onData);

          // Check if device was stationary (low accel variance)
          const accelVariance = this._computeVariance(accelSamples);
          if (accelVariance > MOTION_THRESHOLD) {
            this.status = 'idle';
            reject(new Error('Motion detected during gyro calibration — keep the device still'));
            return;
          }

          // Average gyro readings = bias
          this.gyroBias = this._average(samples);
          resolve(this.gyroBias);
        }
      };

      imuConnection.on('data', onData);
    });
  }

  /**
   * Calibrate mounting offset using the current AHRS output.
   * Averages the current roll/pitch/heading as the zero reference.
   */
  calibrateMountingOffset(imuConnection, fusion) {
    return new Promise((resolve) => {
      this.status = 'calibrating_mount';
      this.progress = 0;

      const samples = [];

      const onData = (data) => {
        const corrected = {
          accel: data.accel,
          gyro: this.applyGyro(data.gyro),
          mag: this.applyMag(data.mag),
          timestamp: data.timestamp,
        };
        const attitude = fusion.update(corrected);
        samples.push(attitude);
        this.progress = Math.round((samples.length / MOUNT_CAL_SAMPLES) * 100);

        if (samples.length >= MOUNT_CAL_SAMPLES) {
          imuConnection.removeListener('data', onData);

          // Average the attitude readings as mounting offset
          const avgRoll = samples.reduce((s, a) => s + a.roll, 0) / samples.length;
          const avgPitch = samples.reduce((s, a) => s + a.pitch, 0) / samples.length;
          // Don't offset heading — user may want magnetic heading as-is
          this.mountingOffset = { roll: avgRoll, pitch: avgPitch, heading: 0 };
          resolve(this.mountingOffset);
        }
      };

      imuConnection.on('data', onData);
    });
  }

  /**
   * Start magnetometer calibration. Collects samples while user rotates the device.
   * Call stopMagCalibration() when done.
   */
  startMagCalibration(imuConnection) {
    this.status = 'calibrating_mag';
    this.progress = 0;
    this.magSamples = 0;
    this._magMin = { x: Infinity, y: Infinity, z: Infinity };
    this._magMax = { x: -Infinity, y: -Infinity, z: -Infinity };

    this._magListener = (data) => {
      const { x, y, z } = data.mag;
      this._magMin.x = Math.min(this._magMin.x, x);
      this._magMin.y = Math.min(this._magMin.y, y);
      this._magMin.z = Math.min(this._magMin.z, z);
      this._magMax.x = Math.max(this._magMax.x, x);
      this._magMax.y = Math.max(this._magMax.y, y);
      this._magMax.z = Math.max(this._magMax.z, z);
      this.magSamples++;
    };

    imuConnection.on('data', this._magListener);
  }

  /**
   * Finish magnetometer calibration. Computes hard-iron and soft-iron from collected samples.
   * Returns null if insufficient data.
   */
  stopMagCalibration(imuConnection) {
    if (this._magListener) {
      imuConnection.removeListener('data', this._magListener);
      this._magListener = null;
    }

    if (this.magSamples < 50) {
      this.status = 'idle';
      return null;
    }

    // Hard-iron offset = center of bounding box
    this.magHardIron = {
      x: (this._magMax.x + this._magMin.x) / 2,
      y: (this._magMax.y + this._magMin.y) / 2,
      z: (this._magMax.z + this._magMin.z) / 2,
    };

    // Soft-iron scale = normalize axes to equal range
    const rangeX = (this._magMax.x - this._magMin.x) / 2 || 1;
    const rangeY = (this._magMax.y - this._magMin.y) / 2 || 1;
    const rangeZ = (this._magMax.z - this._magMin.z) / 2 || 1;
    const avgRange = (rangeX + rangeY + rangeZ) / 3;

    this.magSoftIron = {
      x: avgRange / rangeX,
      y: avgRange / rangeY,
      z: avgRange / rangeZ,
    };

    this.status = 'complete';
    this.calibrated = true;
    return { hardIron: this.magHardIron, softIron: this.magSoftIron, samples: this.magSamples };
  }

  /**
   * Apply gyro bias correction.
   */
  applyGyro(gyro) {
    return {
      x: gyro.x - this.gyroBias.x,
      y: gyro.y - this.gyroBias.y,
      z: gyro.z - this.gyroBias.z,
    };
  }

  /**
   * Apply magnetometer hard-iron and soft-iron correction.
   */
  applyMag(mag) {
    return {
      x: (mag.x - this.magHardIron.x) * this.magSoftIron.x,
      y: (mag.y - this.magHardIron.y) * this.magSoftIron.y,
      z: (mag.z - this.magHardIron.z) * this.magSoftIron.z,
    };
  }

  /**
   * Apply mounting offset to AHRS output.
   */
  applyMountingOffset(attitude) {
    return {
      roll: attitude.roll - this.mountingOffset.roll,
      pitch: attitude.pitch - this.mountingOffset.pitch,
      heading: attitude.heading,
    };
  }

  /**
   * Get current calibration state for UI.
   */
  getState() {
    return {
      status: this.status,
      progress: this.progress,
      calibrated: this.calibrated,
      gyroBias: this.gyroBias,
      magHardIron: this.magHardIron,
      magSoftIron: this.magSoftIron,
      mountingOffset: this.mountingOffset,
      magSamples: this.magSamples,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────

  _average(samples) {
    const n = samples.length;
    return {
      x: samples.reduce((s, v) => s + v.x, 0) / n,
      y: samples.reduce((s, v) => s + v.y, 0) / n,
      z: samples.reduce((s, v) => s + v.z, 0) / n,
    };
  }

  _computeVariance(samples) {
    const avg = this._average(samples);
    const n = samples.length;
    let variance = 0;
    for (const s of samples) {
      variance += (s.x - avg.x) ** 2 + (s.y - avg.y) ** 2 + (s.z - avg.z) ** 2;
    }
    return variance / n;
  }
}

module.exports = { IMUCalibration };
