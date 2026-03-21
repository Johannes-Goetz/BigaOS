/**
 * Switch Types
 *
 * Type definitions for the Switches feature — physical relay control
 * via GPIO pins on Raspberry Pi devices.
 */

export type DeviceType = 'rpi4b' | 'rpi5';
export type RelayType = 'normally-off' | 'normally-on';

export type SwitchIcon =
  | 'lightbulb'
  | 'anchor-light'
  | 'nav-light'
  | 'pump'
  | 'fan'
  | 'horn'
  | 'heater'
  | 'fridge'
  | 'inverter'
  | 'outlet'
  | 'water-pump'
  | 'bilge-pump'
  | 'spotlight'
  | 'radio'
  | 'generic';

/** Switch definition as stored in memory / sent to clients */
export interface SwitchDefinition {
  id: string;
  name: string;
  icon: SwitchIcon;
  targetClientId: string;
  deviceType: DeviceType;
  relayType: RelayType;
  gpioPin: number;
  state: boolean;
  locked: boolean; // in-memory only, not persisted
}

/** Database row shape (snake_case, integers for booleans) */
export interface SwitchRow {
  id: string;
  name: string;
  icon: string;
  target_client_id: string;
  device_type: string;
  relay_type: string;
  gpio_pin: number;
  state: number;
  created_at: string;
  updated_at: string;
}

/** Input for creating a new switch */
export interface SwitchCreateInput {
  name: string;
  icon: SwitchIcon;
  targetClientId: string;
  deviceType: DeviceType;
  relayType: RelayType;
  gpioPin: number;
}

/** Input for updating an existing switch */
export interface SwitchUpdateInput {
  name?: string;
  icon?: SwitchIcon;
  targetClientId?: string;
  deviceType?: DeviceType;
  relayType?: RelayType;
  gpioPin?: number;
}

/** Command sent to GPIO agent or local executor */
export interface GpioCommand {
  switchId: string;
  gpioPin: number;
  deviceType: DeviceType;
  targetState: boolean;
}

/** Result from GPIO agent or local executor */
export interface GpioResult {
  switchId: string;
  success: boolean;
  error?: string;
}

/** Initialization payload sent to GPIO agent on connect */
export interface GpioInitPayload {
  switches: Array<{
    switchId: string;
    gpioPin: number;
    deviceType: DeviceType;
    state: boolean;
  }>;
}

/** Convert a database row to a SwitchDefinition */
export function rowToSwitch(row: SwitchRow): SwitchDefinition {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as SwitchIcon,
    targetClientId: row.target_client_id,
    deviceType: row.device_type as DeviceType,
    relayType: row.relay_type as RelayType,
    gpioPin: row.gpio_pin,
    state: row.state === 1,
    locked: false,
  };
}
