import React from 'react';
import { SensorData } from '../../types';
import { SpeedLog } from '../widgets/SpeedLog';
import { Compass } from '../widgets/Compass';
import { BatteryStatus } from '../widgets/BatteryStatus';
import { useLanguage } from '../../i18n/LanguageContext';

interface MotoringViewProps {
  sensorData: SensorData;
}

export const MotoringView: React.FC<MotoringViewProps> = ({ sensorData }) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(255, 167, 38, 0.1)' }}>
        <h2 style={{ marginBottom: '1rem', color: '#ffa726' }}>{t('state.motor_status')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('state.throttle')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {sensorData.propulsion.motor.throttle}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('state.motor_temp')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {sensorData.propulsion.motor.temperature.toFixed(0)}°C
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('chart.status')}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#66bb6a' }}>
              {sensorData.propulsion.motor.state === 'running' ? `✓ ${t('state.running')}` : t('state.stopped')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-3">
        <SpeedLog speed={sensorData.navigation.speedOverGround} />
        <Compass heading={sensorData.navigation.heading} />
        <BatteryStatus
          voltage={sensorData.electrical.battery.voltage}
          current={sensorData.electrical.battery.current}
          stateOfCharge={sensorData.electrical.battery.stateOfCharge}
        />
      </div>
    </div>
  );
};
