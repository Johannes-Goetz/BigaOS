import { Request, Response } from 'express';
import db from '../database/database';

export class DatabaseController {
  /**
   * Get database statistics
   */
  static getStats(req: Request, res: Response): void {
    try {
      const stats = db.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all settings
   */
  static getSettings(req: Request, res: Response): void {
    try {
      const settings = db.getAllSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update a setting
   */
  static updateSetting(req: Request, res: Response): void {
    try {
      const { key, value, description } = req.body;
      if (!key || !value) {
        res.status(400).json({ error: 'Key and value are required' });
        return;
      }
      db.setSetting(key, value, description);
      res.json({ success: true, key, value });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get events/notifications
   */
  static getEvents(req: Request, res: Response): void {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const acknowledged = req.query.acknowledged === 'true' ? true :
                          req.query.acknowledged === 'false' ? false : null;

      const events = db.getEvents(limit, acknowledged);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Acknowledge an event
   */
  static acknowledgeEvent(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid event ID' });
        return;
      }
      db.acknowledgeEvent(id);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get maintenance log
   */
  static getMaintenanceLog(req: Request, res: Response): void {
    try {
      const status = req.query.status as string | undefined;
      const items = db.getMaintenanceItems(status);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Add maintenance item
   */
  static addMaintenanceItem(req: Request, res: Response): void {
    try {
      const { item, description, category, dueDate } = req.body;
      if (!item || !description || !category) {
        res.status(400).json({ error: 'Item, description, and category are required' });
        return;
      }
      const id = db.addMaintenanceItem(item, description, category, dueDate);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update maintenance item
   */
  static updateMaintenanceItem(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      const { status, completedDate, notes } = req.body;

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid maintenance item ID' });
        return;
      }
      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      db.updateMaintenanceStatus(id, status, completedDate, notes);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get trip log
   */
  static getTripLog(req: Request, res: Response): void {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trips = db.getTripLog(limit);
      res.json(trips);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Start a new trip
   */
  static startTrip(req: Request, res: Response): void {
    try {
      const { startLocation, startLat, startLon, crew } = req.body;
      if (!startLocation || startLat === undefined || startLon === undefined) {
        res.status(400).json({ error: 'Start location and coordinates are required' });
        return;
      }
      const id = db.startTrip(startLocation, startLat, startLon, crew);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * End a trip
   */
  static endTrip(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      const {
        endLocation,
        endLat,
        endLon,
        distanceNm,
        maxSpeedKt,
        avgSpeedKt,
        notes,
        weatherSummary
      } = req.body;

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid trip ID' });
        return;
      }
      if (!endLocation || endLat === undefined || endLon === undefined) {
        res.status(400).json({ error: 'End location and coordinates are required' });
        return;
      }

      db.endTrip(
        id,
        endLocation,
        endLat,
        endLon,
        distanceNm || 0,
        maxSpeedKt || 0,
        avgSpeedKt || 0,
        notes,
        weatherSummary
      );
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Clean up old data
   */
  static cleanupOldData(req: Request, res: Response): void {
    try {
      const days = parseInt(req.body.days) || 30;
      db.cleanupOldData(days);
      res.json({ success: true, message: `Cleaned up data older than ${days} days` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
