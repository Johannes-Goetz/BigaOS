import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChartView } from './ChartView';
import { SensorData, GeoPosition } from '../../types';
import { wsService } from '../../services/websocket';
import { sensorAPI } from '../../services/api';

interface MapPageProps {
  onClose?: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onClose }) => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);

  // Dummy drive mode state
  const [dummyMode, setDummyMode] = useState(false);
  const [dummyLat, setDummyLat] = useState(52.5); // Default: North Sea
  const [dummyLon, setDummyLon] = useState(4.5);
  const [dummyHeading, setDummyHeading] = useState(0);
  const [dummySpeed, setDummySpeed] = useState(0); // in knots
  const keysPressed = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const response = await sensorAPI.getAllSensors();
        setSensorData(response.data);
        // Initialize dummy position from actual position
        if (response.data?.navigation?.position) {
          setDummyLat(response.data.navigation.position.latitude);
          setDummyLon(response.data.navigation.position.longitude);
          setDummyHeading(response.data.navigation.headingMagnetic || 0);
        }
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

  // Handle keyboard input for dummy mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Toggle dummy mode with Ctrl+D
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      setDummyMode(prev => !prev);
      return;
    }

    if (!dummyMode) return;

    keysPressed.current.add(e.key.toLowerCase());

    // Speed control with arrow keys
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDummySpeed(prev => Math.min(prev + 1, 30)); // Max 30 knots
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDummySpeed(prev => Math.max(prev - 1, 0)); // Min 0 knots
    }
  }, [dummyMode]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key.toLowerCase());
  }, []);

  // Heading control with WASD (continuous while key is held)
  useEffect(() => {
    if (!dummyMode) return;

    const interval = setInterval(() => {
      const keys = keysPressed.current;
      const turnRate = 3; // degrees per tick

      if (keys.has('a')) {
        setDummyHeading(prev => (prev - turnRate + 360) % 360);
      }
      if (keys.has('d')) {
        setDummyHeading(prev => (prev + turnRate) % 360);
      }
    }, 50); // 20 times per second

    return () => clearInterval(interval);
  }, [dummyMode]);

  // Update position based on speed and heading
  useEffect(() => {
    if (!dummyMode || dummySpeed === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000; // seconds
      lastUpdateRef.current = now;

      // Convert speed from knots to degrees per second
      // 1 knot = 1.852 km/h = 0.0005144 km/s
      // At equator, 1 degree of lat ≈ 111 km
      // So 1 knot ≈ 0.0005144 / 111 ≈ 0.00000463 degrees/second
      const speedInDegreesPerSecond = dummySpeed * 0.00000463;

      // Calculate movement
      const headingRad = (dummyHeading * Math.PI) / 180;
      const deltaLat = Math.cos(headingRad) * speedInDegreesPerSecond * deltaTime;
      const deltaLon = Math.sin(headingRad) * speedInDegreesPerSecond * deltaTime / Math.cos((dummyLat * Math.PI) / 180);

      setDummyLat(prev => prev + deltaLat);
      setDummyLon(prev => prev + deltaLon);
    }, 100); // Update position 10 times per second

    return () => clearInterval(interval);
  }, [dummyMode, dummySpeed, dummyHeading, dummyLat]);

  // Add/remove keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

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

  // Build dummy position as GeoPosition type
  const dummyPosition: GeoPosition = {
    latitude: dummyLat,
    longitude: dummyLon,
    timestamp: new Date(),
  };

  // Use dummy values when in dummy mode, otherwise use real sensor data
  const position = dummyMode ? dummyPosition : sensorData.navigation.position;
  const heading = dummyMode ? dummyHeading : sensorData.navigation.headingMagnetic;
  const speed = dummyMode ? dummySpeed : sensorData.navigation.speedOverGround;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a1929' }}>
      {/* Full screen map */}
      <ChartView
        position={position}
        heading={heading}
        speed={speed}
        depth={sensorData.environment.depth.belowTransducer}
        onClose={onClose}
      />

      {/* Dummy mode indicator */}
      {dummyMode && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 152, 0, 0.9)',
          color: '#000',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <div>DUMMY MODE</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 'normal', opacity: 0.8 }}>
            WASD: steer | ↑↓: speed ({dummySpeed} kt) | Ctrl+D: exit
          </div>
        </div>
      )}
    </div>
  );
};
