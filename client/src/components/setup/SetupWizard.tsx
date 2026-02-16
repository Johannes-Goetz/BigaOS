import React, { useState } from 'react';
import { theme } from '../../styles/theme';
import { SButton, SInput, SCard } from '../ui/SettingsUI';

interface SetupWizardProps {
  onComplete: (id: string, name: string) => void;
}

type WizardStep = 'welcome' | 'name' | 'existing' | 'done';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const SUGGESTED_NAMES = [
  'Helm Display',
  'Cockpit Tablet',
  'Salon Display',
  'Chart Table',
  'Flybridge',
  'Engine Room',
  'Guest Cabin',
  'Owners Cabin',
];

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [clientName, setClientName] = useState('');
  const [existingClients, setExistingClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clients`);
      if (res.ok) {
        const data = await res.json();
        setExistingClients(data.clients || []);
      }
    } catch {
      // Server may not be ready yet, that's fine
    }
  };

  const handleCreate = async () => {
    if (!clientName.trim()) return;
    setLoading(true);
    setError(null);

    const id = crypto.randomUUID();
    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: clientName.trim(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Server returned ${res.status}`);
      }

      setStep('done');
      setTimeout(() => onComplete(id, clientName.trim()), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
      setLoading(false);
    }
  };

  const handleSelectExisting = (client: { id: string; name: string }) => {
    onComplete(client.id, client.name);
  };

  const handleShowExisting = () => {
    fetchClients();
    setStep('existing');
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <WizardContainer>
        <div style={{ textAlign: 'center', marginBottom: theme.space['3xl'] }}>
          {/* Boat/anchor icon */}
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: theme.space.xl }}>
            <path d="M12 2L12 22" />
            <path d="M4.93 10.93L12 2L19.07 10.93" />
            <path d="M2 16C2 16 4 20 12 20C20 20 22 16 22 16" />
          </svg>
          <h1 style={{
            fontSize: theme.fontSize['2xl'],
            fontWeight: theme.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: `0 0 ${theme.space.sm} 0`,
          }}>
            BigaOS
          </h1>
          <p style={{
            fontSize: theme.fontSize.md,
            color: theme.colors.textSecondary,
            margin: 0,
          }}>
            Marine Navigation & Vessel Monitoring
          </p>
        </div>

        <div style={{ marginBottom: theme.space['3xl'] }}>
          <InfoItem icon="chart" text="Navigation charts with offline support" />
          <InfoItem icon="gauge" text="Real-time instrument displays" />
          <InfoItem icon="bell" text="Customizable alerts and alarms" />
          <InfoItem icon="layout" text="Per-display dashboards and layouts" />
        </div>

        <SButton
          variant="primary"
          onClick={() => setStep('name')}
          style={{ width: '100%', padding: '14px', fontSize: theme.fontSize.base }}
        >
          Get Started
        </SButton>

        <button
          onClick={handleShowExisting}
          style={{
            display: 'block',
            width: '100%',
            marginTop: theme.space.lg,
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: theme.fontSize.sm,
            cursor: 'pointer',
            padding: theme.space.sm,
          }}
        >
          Use an existing client
        </button>
      </WizardContainer>
    );
  }

  // Name step
  if (step === 'name') {
    return (
      <WizardContainer>
        <h2 style={{
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textPrimary,
          margin: `0 0 ${theme.space.sm} 0`,
        }}>
          Name This Display
        </h2>
        <p style={{
          fontSize: theme.fontSize.md,
          color: theme.colors.textSecondary,
          margin: `0 0 ${theme.space.xl} 0`,
        }}>
          Give this screen a name so you can identify it later.
        </p>

        <div style={{ marginBottom: theme.space.lg }}>
          <SInput
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g., Helm Display"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && clientName.trim()) handleCreate(); }}
          />
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.space.sm,
          marginBottom: theme.space.xl,
        }}>
          {SUGGESTED_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => setClientName(name)}
              style={{
                background: clientName === name ? theme.colors.primaryLight : theme.colors.bgCard,
                border: `1px solid ${clientName === name ? theme.colors.primary : theme.colors.border}`,
                borderRadius: theme.radius.md,
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.sm,
                padding: `${theme.space.xs} ${theme.space.md}`,
                cursor: 'pointer',
                transition: theme.transition.fast,
              }}
            >
              {name}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: theme.colors.error, fontSize: theme.fontSize.sm, marginBottom: theme.space.md }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: theme.space.md }}>
          <SButton variant="secondary" onClick={() => setStep('welcome')} style={{ flex: 1 }}>
            Back
          </SButton>
          <SButton
            variant="primary"
            onClick={handleCreate}
            disabled={!clientName.trim() || loading}
            style={{ flex: 2 }}
          >
            {loading ? 'Setting up...' : 'Continue'}
          </SButton>
        </div>
      </WizardContainer>
    );
  }

  // Existing clients step
  if (step === 'existing') {
    return (
      <WizardContainer>
        <h2 style={{
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textPrimary,
          margin: `0 0 ${theme.space.sm} 0`,
        }}>
          Select a Client
        </h2>
        <p style={{
          fontSize: theme.fontSize.md,
          color: theme.colors.textSecondary,
          margin: `0 0 ${theme.space.xl} 0`,
        }}>
          Pick an existing client to use on this device.
        </p>

        {existingClients.length === 0 ? (
          <SCard style={{ textAlign: 'center', padding: theme.space.xl }}>
            <p style={{ color: theme.colors.textMuted, margin: 0 }}>
              No clients registered yet.
            </p>
          </SCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space.sm, marginBottom: theme.space.xl, maxHeight: '400px', overflowY: 'auto' }}>
            {existingClients.map((client) => (
              <SCard
                key={client.id}
                style={{
                  cursor: 'pointer',
                  padding: theme.space.lg,
                  transition: theme.transition.fast,
                }}
              >
                <div
                  onClick={() => handleSelectExisting(client)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.colors.textPrimary,
                    }}>
                      {client.name}
                    </div>
                    <div style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.textMuted,
                      marginTop: '2px',
                    }}>
                      {client.id.slice(0, 8)}...
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </SCard>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: theme.space.md }}>
          <SButton variant="secondary" onClick={() => setStep('welcome')} style={{ flex: 1 }}>
            Back
          </SButton>
          <SButton variant="primary" onClick={() => setStep('name')} style={{ flex: 1 }}>
            Create New
          </SButton>
        </div>
      </WizardContainer>
    );
  }

  // Done step
  return (
    <WizardContainer>
      <div style={{ textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: theme.space.xl }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h2 style={{
          fontSize: theme.fontSize.xl,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textPrimary,
          margin: `0 0 ${theme.space.sm} 0`,
        }}>
          Ready to Go
        </h2>
        <p style={{
          fontSize: theme.fontSize.md,
          color: theme.colors.textSecondary,
          margin: 0,
        }}>
          "{clientName}" has been registered.
        </p>
      </div>
    </WizardContainer>
  );
};

// Wrapper container
const WizardContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    width: '100vw',
    height: '100dvh',
    background: theme.colors.bgPrimary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.xl,
  }}>
    <div style={{
      width: '100%',
      maxWidth: '420px',
    }}>
      {children}
    </div>
  </div>
);

// Small info item for welcome screen
const InfoItem: React.FC<{ icon: string; text: string }> = ({ text }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.md,
    padding: `${theme.space.sm} 0`,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  }}>
    <div style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: theme.colors.primary,
      flexShrink: 0,
    }} />
    {text}
  </div>
);
