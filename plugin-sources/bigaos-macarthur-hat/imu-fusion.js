/**
 * IMU Sensor Fusion
 *
 * Wraps the AHRS (Madgwick) filter to produce stable roll, pitch,
 * yaw, and magnetic heading from raw ICM-20948 sensor data.
 *
 * Input:  accel (g), gyro (rad/s), mag (µT)
 * Output: roll, pitch, yaw, heading (all in radians)
 */

const AHRS = require('ahrs');

class IMUFusion {
  constructor(options = {}) {
    const sampleInterval = options.sampleInterval || 20; // ms
    this.ahrs = new AHRS({
      sampleInterval,
      algorithm: 'Madgwick',
      beta: options.beta || 0.4,
    });
    this.lastTimestamp = null;
  }

  /**
   * Update the filter with new sensor readings.
   *
   * @param {object} data - { accel: {x,y,z}, gyro: {x,y,z}, mag: {x,y,z}, timestamp }
   *   accel in g-force, gyro in rad/s, mag in µT
   * @returns {{ roll: number, pitch: number, yaw: number, heading: number }} radians
   */
  update(data) {
    const { accel, gyro, mag } = data;

    // Compute dt for the filter (seconds)
    let dt;
    if (this.lastTimestamp) {
      dt = (data.timestamp - this.lastTimestamp) / 1000;
      // Clamp dt to prevent instability on first samples or stalls
      if (dt <= 0 || dt > 0.5) dt = 0.02;
    } else {
      dt = 0.02;
    }
    this.lastTimestamp = data.timestamp;

    // Update Madgwick filter
    // ahrs expects: gx, gy, gz (rad/s), ax, ay, az (g), mx, my, mz (any consistent unit)
    this.ahrs.update(
      gyro.x, gyro.y, gyro.z,
      accel.x, accel.y, accel.z,
      mag.x, mag.y, mag.z,
      dt,
    );

    // Get Euler angles (radians)
    const euler = this.ahrs.getEulerAngles();

    // euler.heading is magnetic heading from magnetometer
    // Normalize heading to [0, 2π]
    let heading = euler.heading;
    if (heading < 0) heading += 2 * Math.PI;

    return {
      roll: euler.roll,       // radians, ±π
      pitch: euler.pitch,     // radians, ±π/2
      heading,                // radians, [0, 2π] (magnetic)
    };
  }

  reset() {
    this.lastTimestamp = null;
    this.ahrs = new AHRS({
      sampleInterval: 20,
      algorithm: 'Madgwick',
      beta: 0.4,
    });
  }
}

module.exports = { IMUFusion };
