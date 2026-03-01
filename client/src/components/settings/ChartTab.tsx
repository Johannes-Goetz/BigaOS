import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useSettings, SidebarPosition } from '../../context/SettingsContext';
import { useClient } from '../../context/ClientContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { wsService } from '../../services/websocket';
import { SLabel, SOptionGroup, SToggle } from '../ui/SettingsUI';

export const ChartTab: React.FC = () => {
  const { theme } = useTheme();
  const { sidebarPosition, setSidebarPosition } = useSettings();
  const { clientId } = useClient();
  const { t } = useLanguage();

  // Client-specific Chart Only setting
  const [chartOnly, setChartOnly] = useState(() => {
    return localStorage.getItem('bigaos-chart-only') === '1';
  });

  // Listen for client settings changes (e.g. from another tab or remote)
  useEffect(() => {
    const handleSettingsChanged = (data: { key: string; value: any }) => {
      if (data.key === 'chartOnly') {
        const val = !!data.value;
        setChartOnly(val);
        localStorage.setItem('bigaos-chart-only', val ? '1' : '0');
      }
      if (data.key === 'sidebarPosition') {
        setSidebarPosition(data.value as SidebarPosition);
      }
    };

    wsService.on('client_settings_changed', handleSettingsChanged);
    return () => { wsService.off('client_settings_changed', handleSettingsChanged); };
  }, [setSidebarPosition]);

  // Load client-specific settings on mount
  useEffect(() => {
    wsService.emit('get_client_settings', { clientId });

    const handleSync = (data: { settings: Record<string, any> }) => {
      if (data.settings.chartOnly !== undefined) {
        const val = !!data.settings.chartOnly;
        setChartOnly(val);
        localStorage.setItem('bigaos-chart-only', val ? '1' : '0');
      }
      if (data.settings.sidebarPosition) {
        setSidebarPosition(data.settings.sidebarPosition as SidebarPosition);
      }
    };

    wsService.on('client_settings_sync', handleSync);
    return () => { wsService.off('client_settings_sync', handleSync); };
  }, [clientId, setSidebarPosition]);

  const handleChartOnlyChange = useCallback((enabled: boolean) => {
    setChartOnly(enabled);
    localStorage.setItem('bigaos-chart-only', enabled ? '1' : '0');
    // Notify same-tab listeners (App.tsx) since 'storage' event only fires cross-tab
    window.dispatchEvent(new Event('bigaos-chart-only-changed'));
    wsService.emit('client_settings_update', {
      clientId,
      key: 'chartOnly',
      value: enabled,
    });
  }, [clientId]);

  const handleSidebarPositionChange = useCallback((position: SidebarPosition) => {
    setSidebarPosition(position);
    wsService.emit('client_settings_update', {
      clientId,
      key: 'sidebarPosition',
      value: position,
    });
  }, [clientId, setSidebarPosition]);

  const sidebarPositionOptions: SidebarPosition[] = ['left', 'right'];
  const sidebarPositionLabels: Record<SidebarPosition, string> = {
    left: t('settings.sidebar_left'),
    right: t('settings.sidebar_right'),
  };

  return (
    <div>
      <div style={{ marginBottom: theme.space.xl }}>
        <SLabel>{t('settings.sidebar_position')}</SLabel>
        <SOptionGroup
          options={sidebarPositionOptions}
          labels={sidebarPositionLabels}
          value={sidebarPosition}
          onChange={handleSidebarPositionChange}
        />
      </div>

      <div style={{ marginBottom: theme.space.xl }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <SLabel style={{ marginBottom: 0 }}>{t('settings.chart_only')}</SLabel>
            <div style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textMuted,
              marginTop: '2px',
            }}>
              {t('settings.chart_only_desc')}
            </div>
          </div>
          <SToggle
            checked={chartOnly}
            onChange={handleChartOnlyChange}
          />
        </div>
      </div>
    </div>
  );
};
