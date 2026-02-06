import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../../styles/theme';
import { useSettings, windConversions, speedConversions, depthConversions, temperatureConversions } from '../../context/SettingsContext';
import { ALERT_SOUNDS } from '../../utils/audio';
import {
  AlertDefinition,
  AlertDataSource,
  AlertOperator,
  AlertSeverity,
  AlertTone,
  DATA_SOURCE_LABELS,
  DATA_SOURCE_OPERATORS,
  OPERATOR_LABELS,
  OPERATOR_SPOKEN_LABELS,
  SNOOZE_OPTIONS,
  PREMADE_ALERTS,
  TONE_LABELS,
  isWeatherDataSource,
  getUnitForDataSource,
} from '../../types/alerts';

interface AlertEditDialogProps {
  alert: AlertDefinition | null; // null = creating new
  onSave: (alert: AlertDefinition | Omit<AlertDefinition, 'id'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

// Custom Select Component
interface SelectOption<T> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
}

function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: theme.space.md,
          background: theme.colors.bgCardActive,
          border: `1px solid ${isOpen ? theme.colors.primary : theme.colors.border}`,
          borderRadius: theme.radius.md,
          color: selectedOption ? theme.colors.textPrimary : theme.colors.textMuted,
          fontSize: theme.fontSize.md,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          transition: `border-color ${theme.transition.fast}`,
        }}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform ${theme.transition.fast}`,
            opacity: 0.5,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: theme.colors.bgSecondary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.lg,
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: `${theme.space.sm} ${theme.space.md}`,
                background: option.value === value ? theme.colors.primaryLight : 'transparent',
                border: 'none',
                color: option.value === value ? theme.colors.primary : theme.colors.textPrimary,
                fontSize: theme.fontSize.md,
                cursor: 'pointer',
                textAlign: 'left',
                transition: `background ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = theme.colors.bgCardHover;
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
    label: DATA_SOURCE_LABELS[source],
  }));

  const operatorOptions: SelectOption<AlertOperator>[] = validOperators.map((op) => ({
    value: op,
    label: OPERATOR_SPOKEN_LABELS[op],
  }));

  const snoozeOptions: SelectOption<number>[] = SNOOZE_OPTIONS.map((mins) => ({
    value: mins,
    label: `${mins} minutes`,
  }));

  const toneOptions: SelectOption<AlertTone>[] = TONES.map((t) => ({
    value: t,
    label: TONE_LABELS[t],
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
            {isNew ? 'Create Alert' : 'Edit Alert'}
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
              Alert Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter alert name..."
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
              Data Source
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
              Condition
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
                Threshold ({currentUnit})
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
                  Forecast Window (hours)
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
              Snooze Duration
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
              Severity
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
                  {s}
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
              Sound
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
                  Preview
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
              Message Template
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Wind exceeds {threshold}"
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
                <strong>Placeholders:</strong>
              </div>
              <div style={{ display: 'flex', gap: theme.space.lg, flexWrap: 'wrap' }}>
                <span><code style={{ background: theme.colors.bgCard, padding: '2px 4px', borderRadius: '3px' }}>{'{value}'}</code> measured value with unit</span>
                <span><code style={{ background: theme.colors.bgCard, padding: '2px 4px', borderRadius: '3px' }}>{'{threshold}'}</code> threshold with unit</span>
                <span><code style={{ background: theme.colors.bgCard, padding: '2px 4px', borderRadius: '3px' }}>{'{condition}'}</code> condition ({OPERATOR_LABELS[operator]})</span>
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
                Preview:
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
                Reset to Default
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
                Delete
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
              Cancel
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
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
