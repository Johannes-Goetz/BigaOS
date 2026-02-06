import React, { useState } from 'react';
import { theme } from '../../styles/theme';
import { useSettings, windConversions, speedConversions, depthConversions, temperatureConversions } from '../../context/SettingsContext';
import { CustomSelect, SelectOption } from '../ui/CustomSelect';
import { useLanguage } from '../../i18n/LanguageContext';
import { ALERT_SOUNDS } from '../../utils/audio';
import {
  AlertDefinition,
  AlertDataSource,
  AlertOperator,
  AlertSeverity,
  AlertTone,
  DATA_SOURCE_OPERATORS,
  OPERATOR_LABELS,
  SNOOZE_OPTIONS,
  PREMADE_ALERTS,
  isWeatherDataSource,
  getUnitForDataSource,
  getDataSourceLabel,
  getToneLabel,
  getOperatorSpokenLabel,
  getSeverityLabel,
} from '../../types/alerts';

interface AlertEditDialogProps {
  alert: AlertDefinition | null; // null = creating new
  onSave: (alert: AlertDefinition | Omit<AlertDefinition, 'id'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const DATA_SOURCES: AlertDataSource[] = [
  // Sensor data (measured from boat)
  'wind_speed',
  'speed_over_ground',
  'depth',
  'battery_voltage',
  'battery_soc',
  // Weather service - current
  'wind_gusts',
  'wave_height',
  'temperature_air',
  'temperature_water',
  // Weather service - forecast
  'wind_forecast',
  'wave_forecast',
];

const SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];
const TONES: AlertTone[] = [
  'none',
  'beep',
  'notification',
  'alarm',
  'chime',
  'warning',
  'sonar',
  'bell',
  'siren',
  'gentle',
  'urgent',
  'foghorn',
  'triple',
  'ascending',
  'ding',
];

export const AlertEditDialog: React.FC<AlertEditDialogProps> = ({
  alert,
  onSave,
  onDelete,
  onClose,
}) => {
  const {
    windUnit,
    speedUnit,
    depthUnit,
    temperatureUnit,
  } = useSettings();
  const { t } = useLanguage();

  const isNew = alert === null;
  const isPremade = alert?.isPremade ?? false;

  // Initialize form state
  const [name, setName] = useState(alert?.name ?? '');
  const [dataSource, setDataSource] = useState<AlertDataSource>(
    alert?.dataSource ?? 'wind_forecast'
  );
  const [operator, setOperator] = useState<AlertOperator>(
    alert?.operator ?? 'greater_than'
  );
  const [threshold, setThreshold] = useState(alert?.threshold ?? 20);
  const [thresholdInput, setThresholdInput] = useState(String(alert?.threshold ?? 20));
  const [thresholdError, setThresholdError] = useState(false);
  const [forecastHours, setForecastHours] = useState(alert?.forecastHours ?? 1);
  const [snoozeDuration, setSnoozeDuration] = useState(
    alert?.snoozeDurationMinutes ?? 30
  );
  const [severity, setSeverity] = useState<AlertSeverity>(
    alert?.severity ?? 'warning'
  );
  const [tone, setTone] = useState<AlertTone>(alert?.tone ?? 'notification');
  const [message, setMessage] = useState(
    alert?.message ?? 'Value {condition} {threshold} (current: {value})'
  );

  // Get valid operators for current data source
  const validOperators = DATA_SOURCE_OPERATORS[dataSource];
  const isForecastBased = isWeatherDataSource(dataSource);

  // Get dynamic unit label for current data source based on user settings
  // Note: Threshold values are already in user's display units (server converts internally)
  const currentUnit = getUnitForDataSource(
    dataSource,
    windConversions[windUnit].label,
    speedConversions[speedUnit].label,
    depthConversions[depthUnit].label,
    temperatureConversions[temperatureUnit].label
  );

  // Prepare options for selects
  const dataSourceOptions: SelectOption<AlertDataSource>[] = DATA_SOURCES.map((source) => ({
    value: source,
    label: getDataSourceLabel(source, t),
  }));

  const operatorOptions: SelectOption<AlertOperator>[] = validOperators.map((op) => ({
    value: op,
    label: getOperatorSpokenLabel(op, t),
  }));

  const snoozeOptions: SelectOption<number>[] = SNOOZE_OPTIONS.map((mins) => ({
    value: mins,
    label: `${mins} ${t('alerts.minutes')}`,
  }));

  const toneOptions: SelectOption<AlertTone>[] = TONES.map((tone) => ({
    value: tone,
    label: getToneLabel(tone, t),
  }));

  // Update operator when data source changes
  const handleDataSourceChange = (newSource: AlertDataSource) => {
    setDataSource(newSource);
    const newValidOperators = DATA_SOURCE_OPERATORS[newSource];
    if (!newValidOperators.includes(operator)) {
      setOperator(newValidOperators[0]);
    }
  };

  // Play tone preview
  const playTonePreview = () => {
    const playFn = ALERT_SOUNDS[tone];
    if (playFn) {
      playFn();
    }
  };

  // Reset to default (for premade alerts)
  const handleResetToDefault = () => {
    if (!alert?.premadeId) return;
    const defaultAlert = PREMADE_ALERTS.find(
      (a) => a.premadeId === alert.premadeId
    );
    if (defaultAlert) {
      setName(defaultAlert.name);
      setDataSource(defaultAlert.dataSource);
      setOperator(defaultAlert.operator);
      setThreshold(defaultAlert.threshold);
      setThresholdInput(String(defaultAlert.threshold));
      setThresholdError(false);
      setForecastHours(defaultAlert.forecastHours ?? 1);
      setSnoozeDuration(defaultAlert.snoozeDurationMinutes);
      setSeverity(defaultAlert.severity);
      setTone(defaultAlert.tone);
      setMessage(defaultAlert.message);
    }
  };

  // Save handler
  const handleSave = () => {
    const alertData = {
      ...(alert ?? {}),
      name,
      enabled: alert?.enabled ?? true,
      dataSource,
      operator,
      threshold,
      forecastHours: isForecastBased ? forecastHours : undefined,
      snoozeDurationMinutes: snoozeDuration,
      severity,
      tone,
      message,
      isPremade: isPremade,
      premadeId: alert?.premadeId,
    };

    if (isNew) {
      onSave(alertData as Omit<AlertDefinition, 'id'>);
    } else {
      onSave({ ...alertData, id: alert!.id } as AlertDefinition);
    }
  };

  const getSeverityColor = (s: AlertSeverity) => {
    switch (s) {
      case 'info':
        return theme.colors.info;
      case 'warning':
        return theme.colors.warning;
      case 'critical':
        return theme.colors.error;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          padding: theme.space.xl,
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadow.lg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.space.xl,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}
          >
            {isNew ? t('alerts.create_alert') : t('alerts.edit_alert')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.textMuted,
              cursor: 'pointer',
              padding: theme.space.xs,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.lg }}>
          {/* Name */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.alert_name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('alerts.alert_name_placeholder')}
              style={{
                width: '100%',
                padding: theme.space.md,
                background: theme.colors.bgCardActive,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.md,
              }}
            />
          </div>

          {/* Data Source */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.data_source')}
            </label>
            <CustomSelect
              value={dataSource}
              options={dataSourceOptions}
              onChange={handleDataSourceChange}
            />
          </div>

          {/* Operator */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.condition')}
            </label>
            <CustomSelect
              value={operator}
              options={operatorOptions}
              onChange={setOperator}
            />
          </div>

          {/* Threshold and Forecast Hours */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isForecastBased ? '1fr 1fr' : '1fr',
              gap: theme.space.md,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.textMuted,
                  marginBottom: theme.space.xs,
                }}
              >
                {t('alerts.threshold')} ({currentUnit})
              </label>
              <input
                type="text"
                value={thresholdInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setThresholdInput(value);
                  const parsed = parseFloat(value);
                  if (!isNaN(parsed) && value.trim() !== '') {
                    setThreshold(parsed);
                    setThresholdError(false);
                  } else {
                    setThresholdError(value.trim() !== '');
                  }
                }}
                onBlur={() => {
                  // On blur, format the value if valid
                  if (!thresholdError && thresholdInput.trim() !== '') {
                    setThresholdInput(String(threshold));
                  }
                }}
                style={{
                  width: '100%',
                  padding: theme.space.md,
                  background: theme.colors.bgCardActive,
                  border: `1px solid ${thresholdError ? theme.colors.error : theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.md,
                }}
              />
            </div>

            {isForecastBased && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: theme.fontSize.sm,
                    color: theme.colors.textMuted,
                    marginBottom: theme.space.xs,
                  }}
                >
                  {t('alerts.forecast_window')}
                </label>
                <input
                  type="number"
                  value={forecastHours}
                  onChange={(e) =>
                    setForecastHours(parseInt(e.target.value) || 1)
                  }
                  min={1}
                  max={6}
                  style={{
                    width: '100%',
                    padding: theme.space.md,
                    background: theme.colors.bgCardActive,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    color: theme.colors.textPrimary,
                    fontSize: theme.fontSize.md,
                  }}
                />
              </div>
            )}
          </div>

          {/* Snooze Duration */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.snooze_duration')}
            </label>
            <CustomSelect
              value={snoozeDuration}
              options={snoozeOptions}
              onChange={setSnoozeDuration}
            />
          </div>

          {/* Severity */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.severity')}
            </label>
            <div style={{ display: 'flex', gap: theme.space.sm }}>
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  style={{
                    flex: 1,
                    padding: theme.space.md,
                    background:
                      severity === s
                        ? `${getSeverityColor(s)}30`
                        : theme.colors.bgCardActive,
                    border: `1px solid ${
                      severity === s ? getSeverityColor(s) : theme.colors.border
                    }`,
                    borderRadius: theme.radius.md,
                    color:
                      severity === s
                        ? getSeverityColor(s)
                        : theme.colors.textSecondary,
                    fontSize: theme.fontSize.sm,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: `all ${theme.transition.fast}`,
                  }}
                >
                  {getSeverityLabel(s, t)}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.sound')}
            </label>
            <div style={{ display: 'flex', gap: theme.space.sm }}>
              <div style={{ flex: 1 }}>
                <CustomSelect
                  value={tone}
                  options={toneOptions}
                  onChange={setTone}
                />
              </div>
              {tone !== 'none' && (
                <button
                  onClick={playTonePreview}
                  style={{
                    padding: `${theme.space.xs} ${theme.space.md}`,
                    background: theme.colors.bgCard,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.sm,
                    cursor: 'pointer',
                  }}
                >
                  {t('alerts.preview')}
                </button>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                color: theme.colors.textMuted,
                marginBottom: theme.space.xs,
              }}
            >
              {t('alerts.message_template')}
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('alerts.message_placeholder')}
              style={{
                width: '100%',
                padding: theme.space.md,
                background: theme.colors.bgCardActive,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.md,
              }}
            />
            <div
              style={{
                fontSize: theme.fontSize.xs,
                color: theme.colors.textMuted,
                marginTop: theme.space.sm,
                lineHeight: 1.6,
              }}
            >
              <div style={{ marginBottom: theme.space.xs }}>
                <strong>{t('alerts.placeholders')}</strong>
              </div>
              <div style={{ display: 'flex', gap: theme.space.lg, flexWrap: 'wrap' }}>
                <span><code style={{ background: theme.colors.bgCard, padding: '2px 4px', borderRadius: '3px' }}>{'{value}'}</code> {t('alerts.value_desc')}</span>
                <span><code style={{ background: theme.colors.bgCard, padding: '2px 4px', borderRadius: '3px' }}>{'{threshold}'}</code> {t('alerts.threshold_desc')}</span>
                <span><code style={{ background: theme.colors.bgCard, padding: '2px 4px', borderRadius: '3px' }}>{'{condition}'}</code> {t('alerts.condition_desc')} ({OPERATOR_LABELS[operator]})</span>
              </div>
            </div>
            {/* Live preview */}
            <div
              style={{
                marginTop: theme.space.md,
                padding: theme.space.sm,
                background: theme.colors.bgCardActive,
                borderRadius: theme.radius.sm,
                borderLeft: `3px solid ${getSeverityColor(severity)}`,
              }}
            >
              <div
                style={{
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.textMuted,
                  marginBottom: theme.space.xs,
                }}
              >
                {t('alerts.preview_label')}
              </div>
              <div
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.colors.textPrimary,
                }}
              >
                {message
                  .replace('{value}', `${(threshold * 1.2).toFixed(1)}${currentUnit}`)
                  .replace('{threshold}', `${threshold.toFixed(1)}${currentUnit}`)
                  .replace('{condition}', OPERATOR_LABELS[operator])}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: theme.space.xl,
            paddingTop: theme.space.lg,
            borderTop: `1px solid ${theme.colors.border}`,
          }}
        >
          <div>
            {isPremade && (
              <button
                onClick={handleResetToDefault}
                style={{
                  padding: `${theme.space.sm} ${theme.space.md}`,
                  background: 'transparent',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.md,
                  color: theme.colors.textMuted,
                  fontSize: theme.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                {t('alerts.reset_to_default')}
              </button>
            )}
            {onDelete && !isPremade && (
              <button
                onClick={onDelete}
                style={{
                  padding: `${theme.space.sm} ${theme.space.md}`,
                  background: 'transparent',
                  border: `1px solid ${theme.colors.error}`,
                  borderRadius: theme.radius.md,
                  color: theme.colors.error,
                  fontSize: theme.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                {t('common.delete')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: theme.space.sm }}>
            <button
              onClick={onClose}
              style={{
                padding: `${theme.space.sm} ${theme.space.lg}`,
                background: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.md,
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || thresholdError || thresholdInput.trim() === ''}
              style={{
                padding: `${theme.space.sm} ${theme.space.lg}`,
                background: name.trim() && !thresholdError && thresholdInput.trim() !== ''
                  ? theme.colors.primary
                  : theme.colors.bgCardActive,
                border: 'none',
                borderRadius: theme.radius.md,
                color: name.trim() && !thresholdError && thresholdInput.trim() !== ''
                  ? theme.colors.textPrimary
                  : theme.colors.textDisabled,
                fontSize: theme.fontSize.md,
                cursor: name.trim() && !thresholdError && thresholdInput.trim() !== '' ? 'pointer' : 'not-allowed',
              }}
            >
              {isNew ? t('alerts.create') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
