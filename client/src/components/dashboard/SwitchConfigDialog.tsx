import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useSwitches } from '../../context/SwitchContext';
import { SButton, SLabel } from '../ui/SettingsUI';
import { CustomSelect, type SelectOption } from '../ui/CustomSelect';
import type { SwitchDashboardConfig } from '../../types/switches';

const COLOR_PRESETS = [
  { value: '', label: 'Default (Green)' },
  { value: '#4caf50', label: 'Green' },
  { value: '#2196f3', label: 'Blue' },
  { value: '#ff9800', label: 'Orange' },
  { value: '#f44336', label: 'Red' },
  { value: '#ffffff', label: 'White' },
];

interface SwitchConfigDialogProps {
  config?: SwitchDashboardConfig;
  onSave: (config: SwitchDashboardConfig) => void;
  onClose: () => void;
}

export const SwitchConfigDialog: React.FC<SwitchConfigDialogProps> = ({ config, onSave, onClose }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { switches } = useSwitches();

  const [switchId, setSwitchId] = useState(config?.switchId || '');
  const [activeColor, setActiveColor] = useState(config?.activeColor || '');

  const switchOptions: SelectOption<string>[] = switches.map(sw => ({
    value: sw.id,
    label: sw.name,
  }));

  const colorOptions: SelectOption<string>[] = COLOR_PRESETS.map(c => ({
    value: c.value,
    label: c.label,
  }));

  const handleSave = () => {
    if (!switchId) return;
    onSave({ switchId, activeColor: activeColor || undefined });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: theme.colors.bgOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: theme.zIndex.modal,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.colors.bgSecondary,
          borderRadius: theme.radius.lg,
          padding: theme.space['2xl'],
          width: '100%',
          maxWidth: '360px',
          boxShadow: theme.shadow.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          margin: `0 0 ${theme.space.xl} 0`,
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}>
          {t('switches.configure')}
        </h2>

        {/* Switch selector */}
        <div style={{ marginBottom: theme.space.lg }}>
          <SLabel>{t('switches.select_switch')}</SLabel>
          <CustomSelect
            value={switchId}
            options={switchOptions}
            onChange={setSwitchId}
            placeholder={t('switches.select_switch')}
          />
        </div>

        {/* Color */}
        <div style={{ marginBottom: theme.space.xl }}>
          <SLabel>{t('switches.active_color')}</SLabel>
          <CustomSelect
            value={activeColor}
            options={colorOptions}
            onChange={setActiveColor}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: theme.space.md }}>
          <SButton variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            {t('common.cancel')}
          </SButton>
          <SButton variant="primary" onClick={handleSave} disabled={!switchId} style={{ flex: 1 }}>
            {t('common.save')}
          </SButton>
        </div>
      </div>
    </div>
  );
};
