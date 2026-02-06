/**
 * Server-side alert types for BigaOS
 *
 * Alerts are evaluated on the server using standard units (m/s, Kelvin, meters).
 * Thresholds are stored in standard units.
 * Messages are resolved with display units before being sent to clients.
 */

import { UnitCategory } from './units.types';

// ============================================================================
// Alert Sound and Severity Types
// ============================================================================

export type AlertTone =
  | 'none'
  | 'beep'
  | 'notification'
  | 'alarm'
  | 'chime'
  | 'warning'
  | 'sonar'
  | 'bell'
  | 'siren'
  | 'gentle'
  | 'urgent'
  | 'foghorn'
  | 'triple'
  | 'ascending'
  | 'ding';

export type AlertSeverity = 'info' | 'warning' | 'critical';

// ============================================================================
// Alert Data Sources
// ============================================================================

export type AlertDataSource =
  // Sensor - measured from boat instruments
  | 'wind_speed'
  | 'speed_over_ground'
  | 'depth'
  | 'battery_voltage'
  | 'battery_soc'
  // Weather service - current conditions
  | 'wind_gusts'
  | 'wave_height'
  | 'temperature_air'
  | 'temperature_water'
  // Weather service - forecast
  | 'wind_forecast'
  | 'wave_forecast';

export type AlertOperator =
  | 'greater_than'
  | 'greater_or_equal'
  | 'less_than'
  | 'less_or_equal'
  | 'equals'
  | 'not_equals';

// ============================================================================
// Data Source Metadata
// ============================================================================

export const DATA_SOURCE_LABELS: Record<AlertDataSource, string> = {
  wind_speed: 'Wind Speed (Sensor)',
  speed_over_ground: 'Speed Over Ground (Sensor)',
  depth: 'Depth (Sensor)',
  battery_voltage: 'Battery Voltage (Sensor)',
  battery_soc: 'Battery SOC (Sensor)',
  wind_gusts: 'Wind Gusts (Weather)',
  wave_height: 'Wave Height (Weather)',
  temperature_air: 'Air Temperature (Weather)',
  temperature_water: 'Water Temperature (Weather)',
  wind_forecast: 'Wind Forecast (Weather)',
  wave_forecast: 'Wave Forecast (Weather)',
};

/**
 * Maps each data source to its unit category for conversion
 */
export const DATA_SOURCE_UNIT_CATEGORY: Record<AlertDataSource, UnitCategory> = {
  wind_speed: 'wind',
  wind_gusts: 'wind',
  wind_forecast: 'wind',
  speed_over_ground: 'speed',
  depth: 'depth',
  wave_height: 'depth',
  wave_forecast: 'depth',
  temperature_air: 'temperature',
  temperature_water: 'temperature',
  battery_voltage: 'fixed',
  battery_soc: 'fixed',
};

/**
 * Fixed units that don't depend on user preferences
 */
export const FIXED_UNITS: Partial<Record<AlertDataSource, string>> = {
  battery_voltage: 'V',
  battery_soc: '%',
};

/**
 * Weather-based data sources (support forecast hours)
 */
export const WEATHER_DATA_SOURCES: AlertDataSource[] = [
  'wind_gusts',
  'wave_height',
  'temperature_air',
  'temperature_water',
  'wind_forecast',
  'wave_forecast',
];

export function isWeatherDataSource(source: AlertDataSource): boolean {
  return WEATHER_DATA_SOURCES.includes(source);
}

export const OPERATOR_LABELS: Record<AlertOperator, string> = {
  greater_than: '>',
  greater_or_equal: '>=',
  less_than: '<',
  less_or_equal: '<=',
  equals: '=',
  not_equals: '!=',
};

// ============================================================================
// Alert Definition (stored on server)
// ============================================================================

/**
 * Alert definition stored on server
 * Threshold is stored in STANDARD UNITS (m/s, meters, Kelvin)
 */
export interface AlertDefinition {
  id: string;
  name: string;
  enabled: boolean;
  dataSource: AlertDataSource;
  operator: AlertOperator;
  threshold: number; // STANDARD UNITS (m/s, meters, Kelvin)
  forecastHours?: number; // For forecast-based alerts
  snoozeDurationMinutes: number;
  severity: AlertSeverity;
  tone: AlertTone;
  message: string; // Template with {value}, {threshold}, {condition} placeholders
  isPremade: boolean;
  premadeId?: string;
}

/**
 * Alert definition as received from client (user's units)
 * The server converts threshold to standard units before storing
 */
export interface AlertDefinitionInput {
  id?: string; // Omit for new alerts
  name: string;
  enabled: boolean;
  dataSource: AlertDataSource;
  operator: AlertOperator;
  threshold: number; // USER'S UNITS - server converts to standard
  forecastHours?: number;
  snoozeDurationMinutes: number;
  severity: AlertSeverity;
  tone: AlertTone;
  message: string;
  isPremade?: boolean;
  premadeId?: string;
}

// ============================================================================
// Triggered Alert (runtime state)
// ============================================================================

/**
 * A triggered alert with resolved message
 */
export interface TriggeredAlert {
  alertId: string;
  alertName: string;
  triggeredAt: string; // ISO 8601 date string
  currentValue: number; // Display units (for showing to user)
  threshold: number; // Display units (for showing to user)
  message: string; // Resolved message with display units
  severity: AlertSeverity;
  tone: AlertTone;
  snoozedUntil?: string; // ISO 8601 date string, if snoozed
}

// ============================================================================
// Alert Settings
// ============================================================================

export interface AlertSettings {
  globalEnabled: boolean;
  alerts: AlertDefinition[];
}

// ============================================================================
// Default/Premade Alerts (in STANDARD units)
// ============================================================================

/**
 * Default premade alerts using STANDARD UNITS:
 * - Wind: 10.29 m/s = 20 knots, 15.43 m/s = 30 knots
 * - Waves: 2.0 meters
 * - Battery: 12.0 V (no conversion)
 */
export const PREMADE_ALERTS: Omit<AlertDefinition, 'id'>[] = [
  {
    name: 'Wind Alert',
    enabled: true,
    dataSource: 'wind_forecast',
    operator: 'greater_than',
    threshold: 10.29, // 20 knots in m/s (20 * 0.514444)
    forecastHours: 1,
    snoozeDurationMinutes: 30,
    severity: 'warning',
    tone: 'notification',
    message: 'Wind forecast {condition} {threshold} (max: {value} in next hour)',
    isPremade: true,
    premadeId: 'wind_alert_20kt_1h',
  },
  {
    name: 'High Wind Warning',
    enabled: true,
    dataSource: 'wind_forecast',
    operator: 'greater_than',
    threshold: 15.43, // 30 knots in m/s (30 * 0.514444)
    forecastHours: 3,
    snoozeDurationMinutes: 60,
    severity: 'critical',
    tone: 'alarm',
    message: 'Strong winds ({value}) forecast in next 3 hours',
    isPremade: true,
    premadeId: 'wind_alert_30kt_3h',
  },
  {
    name: 'Low Battery',
    enabled: true,
    dataSource: 'battery_voltage',
    operator: 'less_than',
    threshold: 12.0, // Volts (no conversion)
    snoozeDurationMinutes: 15,
    severity: 'critical',
    tone: 'alarm',
    message: 'Battery voltage low: {value}',
    isPremade: true,
    premadeId: 'low_battery_12v',
  },
  {
    name: 'High Wave Alert',
    enabled: true,
    dataSource: 'wave_forecast',
    operator: 'greater_than',
    threshold: 2.0, // meters (no conversion needed)
    forecastHours: 3,
    snoozeDurationMinutes: 30,
    severity: 'warning',
    tone: 'notification',
    message: 'Waves forecast {condition} {threshold} (max: {value} in next 3 hours)',
    isPremade: true,
    premadeId: 'wave_alert_2m_3h',
  },
];

/**
 * Initialize premade alerts with generated IDs
 */
export function initializePremadeAlerts(): AlertDefinition[] {
  return PREMADE_ALERTS.map((alert) => ({
    ...alert,
    id: `premade_${alert.premadeId}`,
  }));
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  globalEnabled: true,
  alerts: initializePremadeAlerts(),
};

// ============================================================================
// Alert Helper Functions
// ============================================================================

export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Resolve message placeholders with actual values
 * @param message Template message
 * @param value Current value in display units
 * @param threshold Threshold in display units
 * @param operator Alert operator
 * @param unit Unit label (e.g., "kt", "m")
 */
export function resolveAlertMessage(
  message: string,
  value: number,
  threshold: number,
  operator?: AlertOperator,
  unit?: string
): string {
  const unitStr = unit ?? '';
  return message
    .replace('{value}', `${value.toFixed(1)}${unitStr}`)
    .replace('{threshold}', `${threshold.toFixed(1)}${unitStr}`)
    .replace('{condition}', operator ? OPERATOR_LABELS[operator] : '');
}

/**
 * Evaluate an alert condition
 */
export function evaluateCondition(
  value: number,
  operator: AlertOperator,
  threshold: number
): boolean {
  switch (operator) {
    case 'greater_than':
      return value > threshold;
    case 'greater_or_equal':
      return value >= threshold;
    case 'less_than':
      return value < threshold;
    case 'less_or_equal':
      return value <= threshold;
    case 'equals':
      return Math.abs(value - threshold) < 0.001; // Float comparison
    case 'not_equals':
      return Math.abs(value - threshold) >= 0.001;
    default:
      return false;
  }
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface AlertTriggeredEvent {
  type: 'alert_triggered';
  alert: TriggeredAlert;
}

export interface AlertClearedEvent {
  type: 'alert_cleared';
  alertId: string;
}

export interface AlertSnoozedEvent {
  type: 'alert_snoozed';
  alertId: string;
  snoozedUntil: string; // ISO 8601 date string
}

export interface AlertSettingsUpdateEvent {
  type: 'alert_settings_update';
  settings: AlertSettings;
}
