/**
 * DataController - Central hub for all data in BigaOS
 *
 * This controller:
 * - Coordinates all data sources (sensors, weather)
 * - Maintains current data snapshot in standard units
 * - Routes data to AlertController for evaluation
 * - Emits events for WebSocket broadcasting
 * - Provides unified data API
 *
 * All data is stored in NMEA2000 standard units internally:
 * - Speed: m/s
 * - Temperature: Kelvin
 * - Pressure: Pascal
 * - Depth: meters
 */

import { EventEmitter } from 'events';
import { SensorDataService, sensorDataService } from './sensor-data.service';
import { WeatherDataService, weatherDataService } from './weather-data.service';
import { AlertService, alertService } from './alert.service';
import { dbWorker } from './database-worker.service';
import {
  StandardSensorData,
  StandardWeatherForecast,
  DataSnapshot,
  DisplaySensorData,
  DisplayWeatherPoint,
} from '../types/data.types';
import {
  UserUnitPreferences,
  DEFAULT_USER_UNITS,
  speedFromStandard,
  temperatureFromStandard,
  depthFromStandard,
  pressureFromStandard,
} from '../types/units.types';
import { TriggeredAlert } from '../types/alert.types';

// Singleton instance
let instance: DataController | null = null;

export class DataController extends EventEmitter {
  private sensorService: SensorDataService;
  private weatherService: WeatherDataService;
  private alertServiceInstance: AlertService;

  private currentSensorData: StandardSensorData | null = null;
  private currentWeatherData: StandardWeatherForecast | null = null;

  // User preferences (loaded from database)
  private userUnits: UserUnitPreferences = { ...DEFAULT_USER_UNITS };

  private constructor() {
    super();
    this.sensorService = sensorDataService;
    this.weatherService = weatherDataService;
    this.alertServiceInstance = alertService;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DataController {
    if (!instance) {
      instance = new DataController();
    }
    return instance;
  }

  /**
   * Initialize the DataController and all sub-services
   */
  async initialize(): Promise<void> {
    console.log('[DataController] Initializing...');

    // Load user unit preferences from database
    await this.loadUserPreferences();

    // Initialize alert service
    await this.alertServiceInstance.initialize();

    // Set up sensor data listener
    this.sensorService.on('sensor_data', (data: StandardSensorData) => {
      this.onSensorData(data);
    });

    // Set up weather data listener
    this.weatherService.on('weather_data', (data: StandardWeatherForecast) => {
      this.onWeatherData(data);
    });

    // Set up alert listeners
    this.alertServiceInstance.on('alert_triggered', (alert: TriggeredAlert) => {
      this.emit('alert_triggered', alert);
    });

    this.alertServiceInstance.on('alert_cleared', (alertId: string) => {
      this.emit('alert_cleared', alertId);
    });

    this.alertServiceInstance.on('alert_snoozed', (data: { alertId: string; snoozedUntil: string }) => {
      this.emit('alert_snoozed', data);
    });

    // Initialize weather service with position callback
    await this.weatherService.initialize(() => this.sensorService.getCurrentPosition());

    // Start sensor data generation
    this.sensorService.start();

    console.log('[DataController] Initialized successfully');
  }

  /**
   * Load user unit preferences from database
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const speedUnit = await dbWorker.getSetting('speedUnit');
      const windUnit = await dbWorker.getSetting('windUnit');
      const depthUnit = await dbWorker.getSetting('depthUnit');
      const temperatureUnit = await dbWorker.getSetting('temperatureUnit');

      if (speedUnit) this.userUnits.speedUnit = JSON.parse(speedUnit);
      if (windUnit) this.userUnits.windUnit = JSON.parse(windUnit);
      if (depthUnit) this.userUnits.depthUnit = JSON.parse(depthUnit);
      if (temperatureUnit) this.userUnits.temperatureUnit = JSON.parse(temperatureUnit);

      console.log('[DataController] Loaded user preferences:', this.userUnits);
    } catch (error) {
      console.error('[DataController] Error loading user preferences, using defaults:', error);
    }
  }

  /**
   * Update user unit preferences
   */
  updateUserPreferences(preferences: Partial<UserUnitPreferences>): void {
    this.userUnits = { ...this.userUnits, ...preferences };
    console.log('[DataController] Updated user preferences:', this.userUnits);
  }

  /**
   * Get current user unit preferences
   */
  getUserPreferences(): UserUnitPreferences {
    return { ...this.userUnits };
  }

  // ============================================================================
  // Data Event Handlers
  // ============================================================================

  /**
   * Called when new sensor data is available
   */
  private onSensorData(data: StandardSensorData): void {
    this.currentSensorData = data;

    // Evaluate alerts against sensor data
    this.alertServiceInstance.evaluateSensorData(data);

    // Emit event with data in DISPLAY units for WebSocket
    const displayData = this.convertSensorDataToDisplay(data);
    this.emit('sensor_update', displayData);
  }

  /**
   * Called when new weather data is available
   */
  private onWeatherData(data: StandardWeatherForecast): void {
    this.currentWeatherData = data;

    // Evaluate alerts against weather data
    this.alertServiceInstance.evaluateWeatherData(data);

    // Emit event with data in DISPLAY units for WebSocket
    const displayData = this.convertWeatherToDisplay(data);
    this.emit('weather_update', displayData);
  }

  // ============================================================================
  // Data Access
  // ============================================================================

  /**
   * Get complete data snapshot in STANDARD units
   */
  getSnapshot(): DataSnapshot {
    return {
      timestamp: new Date().toISOString(),
      sensors: this.currentSensorData,
      weather: this.currentWeatherData,
    };
  }

  /**
   * Get current sensor data in STANDARD units
   */
  getSensorData(): StandardSensorData | null {
    return this.currentSensorData;
  }

  /**
   * Get current weather data in STANDARD units
   */
  getWeatherData(): StandardWeatherForecast | null {
    return this.currentWeatherData;
  }

  /**
   * Get sensor data converted to user's display units
   */
  getSensorDataForDisplay(): DisplaySensorData | null {
    if (!this.currentSensorData) return null;
    return this.convertSensorDataToDisplay(this.currentSensorData);
  }

  /**
   * Get a specific data value by path (e.g., "navigation.speedOverGround")
   */
  getData(path: string): any {
    if (!this.currentSensorData) return null;

    const parts = path.split('.');
    let value: any = this.currentSensorData;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  // ============================================================================
  // Unit Conversion for Display
  // ============================================================================

  /**
   * Convert sensor data from standard units to user's display units
   */
  convertSensorDataToDisplay(data: StandardSensorData): DisplaySensorData {
    const units = this.userUnits;

    return {
      timestamp: data.timestamp,
      navigation: {
        position: data.navigation.position,
        courseOverGround: data.navigation.courseOverGround,
        speedOverGround: speedFromStandard(data.navigation.speedOverGround, units.speedUnit),
        headingMagnetic: data.navigation.headingMagnetic,
        headingTrue: data.navigation.headingTrue,
        attitude: data.navigation.attitude,
      },
      environment: {
        depth: {
          belowTransducer: depthFromStandard(data.environment.depth.belowTransducer, units.depthUnit),
        },
        wind: {
          speedApparent: speedFromStandard(data.environment.wind.speedApparent, units.windUnit),
          angleApparent: data.environment.wind.angleApparent,
          speedTrue: speedFromStandard(data.environment.wind.speedTrue, units.windUnit),
          angleTrue: data.environment.wind.angleTrue,
        },
        temperature: {
          engineRoom: temperatureFromStandard(data.environment.temperature.engineRoom, units.temperatureUnit),
          cabin: temperatureFromStandard(data.environment.temperature.cabin, units.temperatureUnit),
          batteryCompartment: temperatureFromStandard(
            data.environment.temperature.batteryCompartment,
            units.temperatureUnit
          ),
          outside: temperatureFromStandard(data.environment.temperature.outside, units.temperatureUnit),
        },
      },
      electrical: {
        battery: {
          voltage: data.electrical.battery.voltage, // No conversion
          current: data.electrical.battery.current, // No conversion
          temperature: temperatureFromStandard(data.electrical.battery.temperature, units.temperatureUnit),
          stateOfCharge: data.electrical.battery.stateOfCharge, // No conversion
        },
      },
      propulsion: {
        motor: {
          state: data.propulsion.motor.state,
          temperature: temperatureFromStandard(data.propulsion.motor.temperature, units.temperatureUnit),
          throttle: data.propulsion.motor.throttle, // No conversion
        },
      },
    };
  }

  /**
   * Convert weather forecast from standard units to user's display units
   */
  convertWeatherToDisplay(forecast: StandardWeatherForecast): {
    location: { lat: number; lon: number };
    current: DisplayWeatherPoint;
    hourly: DisplayWeatherPoint[];
    fetchedAt: string;
    expiresAt: string;
  } {
    const units = this.userUnits;

    const convertPoint = (point: any): DisplayWeatherPoint => ({
      timestamp: point.timestamp,
      location: point.location,
      wind: {
        speed: speedFromStandard(point.wind.speed, units.windUnit),
        direction: point.wind.direction,
        gusts: speedFromStandard(point.wind.gusts, units.windUnit),
      },
      waves: point.waves
        ? {
            height: depthFromStandard(point.waves.height, units.depthUnit),
            direction: point.waves.direction,
            period: point.waves.period,
          }
        : undefined,
      swell: point.swell
        ? {
            height: depthFromStandard(point.swell.height, units.depthUnit),
            direction: point.swell.direction,
            period: point.swell.period,
          }
        : undefined,
      current: point.current,
      pressure: point.pressure ? pressureFromStandard(point.pressure, units.pressureUnit) : undefined,
      seaTemperature: point.seaTemperature
        ? temperatureFromStandard(point.seaTemperature, units.temperatureUnit)
        : undefined,
    });

    return {
      location: forecast.location,
      current: convertPoint(forecast.current),
      hourly: forecast.hourly.map(convertPoint),
      fetchedAt: forecast.fetchedAt,
      expiresAt: forecast.expiresAt,
    };
  }

  // ============================================================================
  // Sub-Service Accessors
  // ============================================================================

  getSensorService(): SensorDataService {
    return this.sensorService;
  }

  getWeatherService(): WeatherDataService {
    return this.weatherService;
  }

  getAlertService(): AlertService {
    return this.alertServiceInstance;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Stop all services and clean up
   */
  stop(): void {
    this.sensorService.stop();
    this.weatherService.stop();
    console.log('[DataController] Stopped');
  }
}

// Export singleton getter
export function getDataController(): DataController {
  return DataController.getInstance();
}
