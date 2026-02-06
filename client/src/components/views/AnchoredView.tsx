import React from 'react';
import { SensorData } from '../../types';
import { DepthGauge } from '../widgets/DepthGauge';
import { WindInstrument } from '../widgets/WindInstrument';
import { GPSPosition } from '../widgets/GPSPosition';
import { useLanguage } from '../../i18n/LanguageContext';

interface AnchoredViewProps {
  sensorData: SensorData;
}

export const AnchoredView: React.FC<AnchoredViewProps> = ({ sensorData }) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(79, 195, 247, 0.1)' }}>
        <h2 style={{ marginBottom: '1rem', color: '#4fc3f7' }}>{t('chart.anchor_status')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('state.alarm_status')}</div>
            <div style={{ fontSize: '1.5rem', color: '#66bb6a', fontWeight: 'bold' }}>✓ OK</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('state.alarm_radius')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>50m</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('state.chain_out')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>25m</div>
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        <DepthGauge depth={sensorData.environment.depth.belowTransducer} />
        <WindInstrument
          speedApparent={sensorData.environment.wind.speedApparent}
          angleApparent={sensorData.environment.wind.angleApparent}
        />
        <GPSPosition position={sensorData.navigation.position} />
      </div>
    </div>
  );
};
