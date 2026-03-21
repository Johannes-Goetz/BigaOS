/**
 * GpioService - Routes GPIO commands to the right executor
 *
 * Handles both local GPIO execution (relay on the server Pi) and
 * remote execution (relay on a remote Pi via GPIO agent over WebSocket).
 *
 * Uses gpiod (gpioset/gpioget) for GPIO control — works on both
 * RPi 4B and RPi 5, and doesn't require filesystem writes (safe for read-only OS).
 */

import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { GpioCommand, GpioResult, DeviceType } from '../types/switch.types';

/** Map device type to gpiod chip name */
function getGpioChip(deviceType: DeviceType): string {
  return deviceType === 'rpi5' ? 'gpiochip4' : 'gpiochip0';
}

export class GpioService extends EventEmitter {
  private localClientId: string | null = null;

  /**
   * Set the local client ID (server's own Pi).
   * If a switch targets this client, GPIO is executed locally.
   */
  setLocalClientId(clientId: string): void {
    this.localClientId = clientId;
  }

  getLocalClientId(): string | null {
    return this.localClientId;
  }

  /**
   * Execute a GPIO command — routes to local or remote execution.
   * Returns a promise that resolves with the result.
   *
   * For remote execution, the caller (WebSocketServer) must listen
   * for the 'gpio_send_remote' event and forward via Socket.IO.
   */
  async execute(targetClientId: string, command: GpioCommand): Promise<GpioResult> {
    if (this.localClientId && targetClientId === this.localClientId) {
      return this.executeLocal(command);
    }

    // Remote execution — emit event for WebSocket server to forward
    return this.executeRemote(targetClientId, command);
  }

  /**
   * Execute GPIO command locally via child_process gpioset
   */
  private executeLocal(command: GpioCommand): Promise<GpioResult> {
    return new Promise((resolve) => {
      const chip = getGpioChip(command.deviceType);
      const value = command.targetState ? 1 : 0;
      const cmd = `gpioset ${chip} ${command.gpioPin}=${value}`;

      exec(cmd, { timeout: 3000 }, (error) => {
        if (error) {
          console.error(`[GpioService] Local gpioset failed: ${error.message}`);
          resolve({
            switchId: command.switchId,
            success: false,
            error: error.message,
          });
        } else {
          resolve({
            switchId: command.switchId,
            success: true,
          });
        }
      });
    });
  }

  /**
   * Execute GPIO command on a remote Pi via WebSocket.
   * Emits 'gpio_send_remote' for the WebSocket server to forward.
   * The result comes back via handleRemoteResult().
   */
  private executeRemote(targetClientId: string, command: GpioCommand): Promise<GpioResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.removeAllListeners(`gpio_result:${command.switchId}`);
        resolve({
          switchId: command.switchId,
          success: false,
          error: 'GPIO agent timeout',
        });
      }, 5000);

      // Listen for the result callback
      this.once(`gpio_result:${command.switchId}`, (result: GpioResult) => {
        clearTimeout(timeout);
        resolve(result);
      });

      // Emit event for WebSocket server to forward to the GPIO agent
      this.emit('gpio_send_remote', { targetClientId, command });
    });
  }

  /**
   * Called by WebSocket server when a GPIO agent sends back a result.
   */
  handleRemoteResult(result: GpioResult): void {
    this.emit(`gpio_result:${result.switchId}`, result);
  }

  /**
   * Initialize all pins for a given client (local execution).
   * Called on server startup for local GPIO pins.
   */
  async initializeLocalPins(pins: Array<{ gpioPin: number; deviceType: DeviceType; state: boolean }>): Promise<void> {
    for (const pin of pins) {
      const chip = getGpioChip(pin.deviceType);
      const value = pin.state ? 1 : 0;
      const cmd = `gpioset ${chip} ${pin.gpioPin}=${value}`;

      try {
        await new Promise<void>((resolve, reject) => {
          exec(cmd, { timeout: 3000 }, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } catch (error: any) {
        console.error(`[GpioService] Failed to init pin ${pin.gpioPin}: ${error.message}`);
      }
    }
  }
}

export const gpioService = new GpioService();
