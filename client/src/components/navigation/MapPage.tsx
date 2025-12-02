import React, { useState, useEffect } from 'react';
import { ChartView } from './ChartView';
import { SensorData } from '../../types';
import { wsService } from '../../services/websocket';
import { sensorAPI } from '../../services/api';

interface MapPageProps {
  onClose?: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onClose }) => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const response = await sensorAPI.getAllSensors();
        setSensorData(response.data);
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      }
    };

    fetchData();

    // Listen for sensor updates via WebSocket
    const handleSensorUpdate = (data: any) => {
      if (data.data) {
        setSensorData(data.data);
      }
    };

    wsService.on('sensor_update', handleSensorUpdate);

    return () => {
      wsService.off('sensor_update', handleSensorUpdate);
    };
  }, []);

  if (!sensorData) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a1929'
      }}>
        <div style={{ fontSize: '1.5rem' }}>Loading map...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a1929' }}>
      {/* Full screen map */}
      <ChartView
        position={sensorData.navigation.position}
        heading={sensorData.navigation.headingMagnetic}
        speed={sensorData.navigation.speedOverGround}
        depth={sensorData.environment.depth.belowTransducer}
        onClose={onClose}
      />
    </div>
  );
};
