/**
 * Unified Data Controller - REST API endpoints for DataController
 *
 * Provides unified access to:
 * - Sensor data
 * - Weather data
 * - Alerts
 * - Data snapshot
 *
 * All data is returned in user's display units.
 */

import { Request, Response } from 'express';
import { DataController, getDataController } from '../services/data.controller';
import { alertService } from '../services/alert.service';
import { AlertDefinitionInput } from '../types/alert.types';

class UnifiedDataController {
  private getController(): DataController {
    return getDataController();
  }

  // ============================================================================
  // Snapshot Endpoints
  // ============================================================================

  /**
   * GET /api/data
   * Get complete data snapshot (sensors + weather)
   */
  getSnapshot = (req: Request, res: Response): void => {
    try {
      const controller = this.getController();
      const sensorData = controller.getSensorDataForDisplay();
      const weatherData = controller.getWeatherData();

      res.json({
        timestamp: new Date().toISOString(),
        sensors: sensorData,
        weather: weatherData ? controller.convertWeatherToDisplay(weatherData) : null,
        units: controller.getUserPreferences(),
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error getting snapshot:', error);
      res.status(500).json({ error: 'Failed to get data snapshot' });
    }
  };

  // ============================================================================
  // Sensor Endpoints
  // ============================================================================

  /**
   * GET /api/data/sensors
   * Get current sensor data in display units
   */
  getSensors = (req: Request, res: Response): void => {
    try {
      const controller = this.getController();
      const sensorData = controller.getSensorDataForDisplay();

      if (!sensorData) {
        res.status(503).json({ error: 'Sensor data not available' });
        return;
      }

      res.json({
        data: sensorData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error getting sensors:', error);
      res.status(500).json({ error: 'Failed to get sensor data' });
    }
  };

  /**
   * GET /api/data/sensors/:path
   * Get specific sensor value (e.g., /api/data/sensors/navigation.speedOverGround)
   */
  getSensorValue = (req: Request, res: Response): void => {
    try {
      const { path } = req.params;
      const controller = this.getController();
      const value = controller.getData(path);

      if (value === null || value === undefined) {
        res.status(404).json({ error: `Sensor path '${path}' not found` });
        return;
      }

      res.json({
        path,
        value,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error getting sensor value:', error);
      res.status(500).json({ error: 'Failed to get sensor value' });
    }
  };

  // ============================================================================
  // Weather Endpoints
  // ============================================================================

  /**
   * GET /api/data/weather
   * Get current weather data in display units
   */
  getWeather = (req: Request, res: Response): void => {
    try {
      const controller = this.getController();
      const weatherData = controller.getWeatherData();

      if (!weatherData) {
        res.status(503).json({ error: 'Weather data not available' });
        return;
      }

      const displayWeather = controller.convertWeatherToDisplay(weatherData);
      res.json({
        data: displayWeather,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error getting weather:', error);
      res.status(500).json({ error: 'Failed to get weather data' });
    }
  };

  // ============================================================================
  // Alert Endpoints
  // ============================================================================

  /**
   * GET /api/data/alerts
   * Get alert settings and triggered alerts
   */
  getAlerts = (req: Request, res: Response): void => {
    try {
      const settings = alertService.getSettings();
      const triggered = alertService.getTriggeredAlerts();
      const alertsForDisplay = alertService.getAlertsForDisplay();

      res.json({
        globalEnabled: settings.globalEnabled,
        alerts: alertsForDisplay,
        triggered,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error getting alerts:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  };

  /**
   * GET /api/data/alerts/:id
   * Get a specific alert
   */
  getAlert = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const alert = alertService.getAlertForDisplay(id);

      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({ alert });
    } catch (error) {
      console.error('[UnifiedDataController] Error getting alert:', error);
      res.status(500).json({ error: 'Failed to get alert' });
    }
  };

  /**
   * PUT /api/data/alerts
   * Create or update an alert
   * Threshold is expected in user's units - server converts to standard
   */
  upsertAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const input: AlertDefinitionInput = req.body;

      if (!input.name || !input.dataSource || !input.operator || input.threshold === undefined) {
        res.status(400).json({ error: 'Missing required fields: name, dataSource, operator, threshold' });
        return;
      }

      const alert = await alertService.upsertAlert(input);
      const alertForDisplay = alertService.getAlertForDisplay(alert.id);

      res.json({
        success: true,
        alert: alertForDisplay,
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error upserting alert:', error);
      res.status(500).json({ error: 'Failed to save alert' });
    }
  };

  /**
   * DELETE /api/data/alerts/:id
   * Delete an alert
   */
  deleteAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await alertService.deleteAlert(id);

      if (!success) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[UnifiedDataController] Error deleting alert:', error);
      res.status(500).json({ error: 'Failed to delete alert' });
    }
  };

  /**
   * POST /api/data/alerts/:id/snooze
   * Snooze a triggered alert
   */
  snoozeAlert = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { minutes } = req.body;

      alertService.snoozeAlert(id, minutes);
      res.json({ success: true });
    } catch (error) {
      console.error('[UnifiedDataController] Error snoozing alert:', error);
      res.status(500).json({ error: 'Failed to snooze alert' });
    }
  };

  /**
   * POST /api/data/alerts/:id/dismiss
   * Dismiss a triggered alert
   */
  dismissAlert = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      alertService.dismissAlert(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[UnifiedDataController] Error dismissing alert:', error);
      res.status(500).json({ error: 'Failed to dismiss alert' });
    }
  };

  /**
   * POST /api/data/alerts/:id/reset
   * Reset a premade alert to default values
   */
  resetPremadeAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Extract premadeId from the alert ID (format: premade_<premadeId>)
      const premadeId = id.replace('premade_', '');
      const alert = await alertService.resetPremadeAlert(premadeId);

      if (!alert) {
        res.status(404).json({ error: 'Premade alert not found' });
        return;
      }

      const alertForDisplay = alertService.getAlertForDisplay(alert.id);
      res.json({
        success: true,
        alert: alertForDisplay,
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error resetting alert:', error);
      res.status(500).json({ error: 'Failed to reset alert' });
    }
  };

  /**
   * PUT /api/data/alerts/global
   * Enable/disable all alerts globally
   */
  setGlobalEnabled = async (req: Request, res: Response): Promise<void> => {
    try {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' });
        return;
      }

      await alertService.setGlobalEnabled(enabled);
      res.json({ success: true, globalEnabled: enabled });
    } catch (error) {
      console.error('[UnifiedDataController] Error setting global enabled:', error);
      res.status(500).json({ error: 'Failed to update global enabled' });
    }
  };

  // ============================================================================
  // Unit Preferences Endpoints
  // ============================================================================

  /**
   * GET /api/data/units
   * Get current unit preferences
   */
  getUnits = (req: Request, res: Response): void => {
    try {
      const controller = this.getController();
      res.json(controller.getUserPreferences());
    } catch (error) {
      console.error('[UnifiedDataController] Error getting units:', error);
      res.status(500).json({ error: 'Failed to get unit preferences' });
    }
  };

  /**
   * PUT /api/data/units
   * Update unit preferences
   */
  updateUnits = (req: Request, res: Response): void => {
    try {
      const preferences = req.body;
      const controller = this.getController();

      controller.updateUserPreferences(preferences);
      alertService.updateUserUnits(preferences);

      res.json({
        success: true,
        units: controller.getUserPreferences(),
      });
    } catch (error) {
      console.error('[UnifiedDataController] Error updating units:', error);
      res.status(500).json({ error: 'Failed to update unit preferences' });
    }
  };
}

export const unifiedDataController = new UnifiedDataController();
