import React from 'react';
import { GeoPosition } from '../../../types';
import { ChartView } from '../../navigation/ChartView';
import 'leaflet/dist/leaflet.css';

interface ChartMiniItemProps {
  position: GeoPosition;
  heading: number;
  speed: number;
  depth: number;
}

export const ChartMiniItem: React.FC<ChartMiniItemProps> = ({ position, heading, speed, depth }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ChartView
        position={position}
        heading={heading}
        speed={speed}
        depth={depth}
        hideSidebar={true}
      />
    </div>
  );
};
