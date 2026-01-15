import React from 'react';
import { CustomMarker, markerIcons, markerColors } from './map-icons';

interface MarkerDialogProps {
  marker?: CustomMarker; // If provided, editing existing marker
  position?: { lat: number; lon: number }; // If provided (and no marker), creating new marker
  markerName: string;
  setMarkerName: (name: string) => void;
  markerColor: string;
  setMarkerColor: (color: string) => void;
  markerIcon: string;
  setMarkerIcon: (icon: string) => void;
  onClose: () => void;
  onSave: (lat: number, lon: number, name: string, color: string, icon: string, id?: string) => void;
}

const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="touch-btn"
    style={{
      position: 'absolute',
      top: '0.75rem',
      right: '0.75rem',
      width: '28px',
      height: '28px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
      color: 'rgba(255, 255, 255, 0.6)',
    }}
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
);

const IconSelector: React.FC<{
  selectedIcon: string;
  selectedColor: string;
  onSelect: (icon: string) => void;
}> = ({ selectedIcon, selectedColor, onSelect }) => (
  <>
    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>
      ICON
    </div>
    <div
      style={{
        display: 'flex',
        gap: '0.4rem',
        marginBottom: '1rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {Object.keys(markerIcons).map((iconKey) => (
        <button
          key={iconKey}
          onClick={() => onSelect(iconKey)}
          className="touch-btn"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background:
              selectedIcon === iconKey
                ? 'rgba(79, 195, 247, 0.3)'
                : 'rgba(255, 255, 255, 0.1)',
            border:
              selectedIcon === iconKey
                ? '2px solid #4fc3f7'
                : '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={selectedColor}
            stroke="#fff"
            strokeWidth="1"
          >
            <path d={markerIcons[iconKey]} />
          </svg>
        </button>
      ))}
    </div>
  </>
);

const ColorSelector: React.FC<{
  selectedColor: string;
  onSelect: (color: string) => void;
}> = ({ selectedColor, onSelect }) => (
  <>
    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>
      COLOR
    </div>
    <div
      style={{
        display: 'flex',
        gap: '0.4rem',
        marginBottom: '1.5rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {markerColors.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className="touch-btn"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: color,
            border:
              selectedColor === color
                ? '2px solid #fff'
                : '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  </>
);

const DialogOverlay: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => (
  <>
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1100,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(10, 25, 41, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '6px',
        padding: '1.5rem',
        zIndex: 1101,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        minWidth: '300px',
      }}
    >
      {children}
    </div>
  </>
);

const NameInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Marker name..."
    autoFocus
    style={{
      width: '100%',
      padding: '0.75rem',
      marginBottom: '1rem',
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '0.9rem',
      outline: 'none',
    }}
  />
);

export const MarkerDialog: React.FC<MarkerDialogProps> = ({
  marker,
  position,
  markerName,
  setMarkerName,
  markerColor,
  setMarkerColor,
  markerIcon,
  setMarkerIcon,
  onClose,
  onSave,
}) => {
  const isEditing = !!marker;
  const lat = marker?.lat ?? position?.lat ?? 0;
  const lon = marker?.lon ?? position?.lon ?? 0;

  return (
    <DialogOverlay onClick={onClose}>
      <CloseButton onClick={onClose} />
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        {isEditing ? 'Edit Marker' : 'Add Marker'}
      </div>
      <NameInput value={markerName} onChange={setMarkerName} />
      <IconSelector
        selectedIcon={markerIcon}
        selectedColor={markerColor}
        onSelect={setMarkerIcon}
      />
      <ColorSelector selectedColor={markerColor} onSelect={setMarkerColor} />
      <button
        onClick={() => {
          if (markerName.trim()) {
            onSave(lat, lon, markerName, markerColor, markerIcon, marker?.id);
          }
        }}
        disabled={!markerName.trim()}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: markerName.trim()
            ? 'rgba(79, 195, 247, 0.5)'
            : 'rgba(255, 255, 255, 0.05)',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          cursor: markerName.trim() ? 'pointer' : 'not-allowed',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          opacity: markerName.trim() ? 1 : 0.5,
        }}
      >
        {isEditing ? 'Save' : 'Add Marker'}
      </button>
    </DialogOverlay>
  );
};

// Scope visualization SVG component
const ScopeVisualization: React.FC<{
  chainLength: number;
  depth: number;
}> = ({ chainLength, depth }) => {
  const scopeRatio = depth > 0 ? chainLength / depth : 0;

  // Calculate horizontal distance from Pythagorean theorem
  const horizontalDistance = chainLength > depth ? Math.sqrt(chainLength ** 2 - depth ** 2) : 0;

  // SVG dimensions - wider aspect ratio to fill dialog width without stretching
  const svgWidth = 300;
  const svgHeight = 110;
  const waterLevel = 25;
  const maxSeabedLevel = 105;
  const boatX = 50;
  const padding = 20; // Padding for anchor icon

  // Dynamic scaling: fit both depth and horizontal distance in the available space
  // Available vertical space for depth
  const availableVertical = maxSeabedLevel - waterLevel - padding;
  // Available horizontal space for chain spread (from boat to right edge)
  const availableHorizontal = svgWidth - boatX - padding;

  // Calculate scale factor to fit everything
  // Scale based on whichever dimension needs more scaling
  const verticalScale = depth > 0 ? availableVertical / depth : 1;
  const horizontalScale = horizontalDistance > 0 ? availableHorizontal / horizontalDistance : Infinity;
  const scale = Math.min(verticalScale, horizontalScale, availableVertical / 5); // Cap scale for very small values

  // Calculate icon scale factor - icons shrink when zoomed out
  // Base scale is 1.0 when scale matches the "normal" view (around 4 pixels per meter)
  const baseScale = 4; // Reference: 4 pixels per meter is "normal" zoom
  const iconScale = Math.min(1, Math.max(0.4, scale / baseScale)); // Clamp between 0.4 and 1.0

  // Apply scale
  const visualDepth = depth * scale;
  const visualHorizontalDistance = horizontalDistance * scale;

  // Calculate seabed position based on scaled depth
  const seabedLevel = waterLevel + visualDepth + 10;

  // Calculate anchor position
  const anchorX = boatX + visualHorizontalDistance;
  const anchorY = waterLevel + visualDepth;

  // Scope quality color - matches the 5-segment bar
  // Bar segments: 0-20% (red), 20-40% (orange), 40-60% (yellow), 60-80% (bright green), 80-100% (green)
  // Position formula: (scopeRatio - 1) / 7 * 100
  // So thresholds: 20% = 2.4:1, 40% = 3.8:1, 60% = 5.2:1, 80% = 6.6:1
  const getScopeColor = () => {
    if (scopeRatio < 2.4) return '#ef5350'; // Red
    if (scopeRatio < 3.8) return '#ffa726'; // Orange
    if (scopeRatio < 5.2) return '#ffee58'; // Yellow
    if (scopeRatio < 6.6) return '#9ccc65'; // Bright green
    return '#66bb6a'; // Green
  };

  // Calculate indicator position on scale (0-100%)
  const getIndicatorPosition = () => {
    // Scale: 0 at ratio 1, 100% at ratio 8+
    const normalized = Math.min(Math.max((scopeRatio - 1) / 7, 0), 1);
    return normalized * 100;
  };

  // Clamp seabed to max height
  const clampedSeabedLevel = Math.min(seabedLevel, maxSeabedLevel);
  const clampedAnchorY = Math.min(anchorY, clampedSeabedLevel - 8);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'hidden' }}>
        {/* Clip path to constrain all elements within SVG bounds */}
        <defs>
          <clipPath id="svgClip">
            <rect x={0} y={0} width={svgWidth} height={svgHeight} />
          </clipPath>
        </defs>

        <g clipPath="url(#svgClip)">
          {/* Water fill - subtle blue below water line, extends to cover wave troughs and up to seabed */}
          {(() => {
            const waveAmplitude = 3 * iconScale;
            const sandAmplitude = 2 * iconScale;
            return (
              <rect
                x={0}
                y={waterLevel - waveAmplitude} // Start above water to cover wave troughs
                width={svgWidth}
                height={clampedSeabedLevel + sandAmplitude - (waterLevel - waveAmplitude)} // Extend to cover sand peaks
                fill="rgba(79, 195, 247, 0.08)"
              />
            );
          })()}

          {/* Water surface with waves - camera-style scaling (sine wave) */}
          {/* When zoomed out (small iconScale): more waves, smaller amplitude */}
          {/* When zoomed in (large iconScale): fewer waves, larger amplitude */}
          {(() => {
            const waveHalfPeriod = 20 * iconScale; // Half-period (crest to trough)
            const waveAmplitude = 3 * iconScale; // Amplitude gets smaller when zoomed out
            const numHalfWaves = Math.ceil(svgWidth / waveHalfPeriod);
            let pathD = `M 0 ${waterLevel}`;
            for (let i = 0; i < numHalfWaves; i++) {
              const x1 = i * waveHalfPeriod + waveHalfPeriod / 2;
              const x2 = (i + 1) * waveHalfPeriod;
              // Alternate between up and down: even = up (crest), odd = down (trough)
              const yPeak = i % 2 === 0
                ? waterLevel - waveAmplitude  // Crest (above water level)
                : waterLevel + waveAmplitude; // Trough (below water level)
              pathD += ` Q ${x1} ${yPeak} ${x2} ${waterLevel}`;
            }
            return (
              <path
                d={pathD}
                fill="none"
                stroke="#4fc3f7"
                strokeWidth={Math.max(1, 2 * iconScale)}
                opacity="0.6"
              />
            );
          })()}

          {/* Seabed - sandy with gentle sine curve */}
          {(() => {
            const sandHalfPeriod = 30 * iconScale;
            const sandAmplitude = 2 * iconScale;
            const numSandWaves = Math.ceil(svgWidth / sandHalfPeriod);
            let sandPathD = `M 0 ${clampedSeabedLevel}`;
            for (let i = 0; i < numSandWaves; i++) {
              const x1 = i * sandHalfPeriod + sandHalfPeriod / 2;
              const x2 = (i + 1) * sandHalfPeriod;
              const yPeak = i % 2 === 0
                ? clampedSeabedLevel - sandAmplitude
                : clampedSeabedLevel + sandAmplitude;
              sandPathD += ` Q ${x1} ${yPeak} ${x2} ${clampedSeabedLevel}`;
            }
            sandPathD += ` L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
            return (
              <>
                <path
                  d={sandPathD}
                  fill="#c4a574"
                  opacity="0.4"
                />
                <path
                  d={sandPathD.split(' L ')[0]}
                  fill="none"
                  stroke="#d4b896"
                  strokeWidth="2"
                />
              </>
            );
          })()}

        {/* Depth indicator line */}
        <line
          x1={boatX - 20}
          y1={waterLevel}
          x2={boatX - 20}
          y2={waterLevel + visualDepth}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
        <text x={boatX - 25} y={waterLevel + visualDepth / 2 + 3} fill="rgba(255,255,255,0.5)" fontSize="8" textAnchor="end">
          {depth.toFixed(1)}m
        </text>

        {/* Chain with catenary physics - lies flat on seabed, curves up to boat */}
        {(() => {
          // Chain endpoints
          const boatBowX = boatX + 12 * iconScale;
          const boatBowY = waterLevel;
          const seabedY = clampedSeabedLevel - 2; // Slightly above seabed line
          // Anchor is at (anchorX, seabedY), rotated -90deg
          // Ring at (0,-6) in local coords becomes (6, 0) after -90deg rotation (x' = -y, y' = x)
          // So ring position = anchor position + (6 * scale, 0) but we need to go LEFT toward boat
          // After rotation, the ring is to the LEFT of anchor center (negative X direction)
          const anchorRingX = anchorX - 6 * iconScale * 0.7;
          const anchorRingY = seabedY; // Ring is at seabed level

          // Calculate how much chain lies on the bottom based on scope
          // Higher scope = more excess chain = more lying flat on seabed
          const excessRatio = Math.max(0, scopeRatio - 1); // How much scope beyond minimum
          const chainOnBottomFraction = Math.min(0.7, excessRatio * 0.12); // 0 to 70% of horizontal distance

          // Distance from anchor to where chain lifts off seabed (toward boat)
          const horizontalSpan = Math.abs(boatBowX - anchorRingX);
          const chainOnBottomLength = horizontalSpan * chainOnBottomFraction;

          // Lift-off point: where chain leaves seabed and curves up to boat
          const liftOffX = anchorRingX - chainOnBottomLength; // Go left from anchor toward boat
          const liftOffY = seabedY;

          let chainPath: string;

          if (chainOnBottomLength > 3 && scopeRatio > 2.5) {
            // Good scope: chain lies FLAT on seabed from anchor, then curves up to boat
            // Anchor ring is already at seabed level, so chain starts flat

            // Control point for smooth curve from lift-off to boat
            const curveControlX = liftOffX + (boatBowX - liftOffX) * 0.3;
            const curveControlY = seabedY + 8 * iconScale; // Below seabed for smooth curve

            chainPath = `M ${anchorRingX} ${anchorRingY}` + // Start at anchor ring (at seabed)
              ` L ${liftOffX} ${seabedY}` + // Flat along seabed toward boat
              ` Q ${curveControlX} ${curveControlY} ${boatBowX} ${boatBowY}`; // Curve up to boat
          } else {
            // Low scope: chain hangs more taut with a curve
            // Control point creates a sag proportional to scope
            const sagAmount = Math.min(visualDepth * 0.4, 15) * Math.max(0.3, (scopeRatio - 1) / 3);
            const midX = (boatBowX + anchorRingX) / 2;
            const midY = Math.max(anchorRingY, seabedY - sagAmount);

            chainPath = `M ${anchorRingX} ${anchorRingY}` +
              ` Q ${midX} ${midY} ${boatBowX} ${boatBowY}`;
          }

          return (
            <path
              d={chainPath}
              fill="none"
              stroke="#aaa"
              strokeWidth={Math.max(1, 2 * iconScale)}
              strokeDasharray={`${4 * iconScale},${2 * iconScale}`}
            />
          );
        })()}

        {/* Boat silhouette - simple sailboat (facing right), sitting on water */}
        <g transform={`translate(${boatX}, ${waterLevel - 6 * iconScale}) scale(${iconScale})`}>
          {/* Hull - flat stern (left), pointy bow (right) */}
          <path
            d="M -10 4 L -10 8 L 10 8 L 12 4 Z"
            fill="#2c3e50"
            stroke="#fff"
            strokeWidth="1"
          />
          {/* Mast */}
          <line x1="0" y1="4" x2="0" y2="-16" stroke="#fff" strokeWidth="1.5" />
          {/* Mainsail */}
          <path
            d="M -1 -14 L -8 2 L -1 2 Z"
            fill="rgba(255,255,255,0.8)"
            stroke="#fff"
            strokeWidth="0.5"
          />
          {/* Foresail (jib) */}
          <path
            d="M 1 -14 L 10 2 L 1 2 Z"
            fill="rgba(255,255,255,0.7)"
            stroke="#fff"
            strokeWidth="0.5"
          />
        </g>

        {/* Anchor - rotated -90deg and partially buried in sand */}
        {/* Position anchor so its ring connects to where chain meets seabed */}
        {(() => {
          // Anchor ring offset after rotation: ring at (0,-6) rotated -90deg becomes (-6, 0) in local coords
          // But we need to position anchor so ring is at seabed level
          const anchorSeabedY = clampedSeabedLevel - 2; // Same as chain's seabedY
          // The ring center in anchor local coords (after rotation) is at x offset of +6 (ring was at y=-6)
          // So anchor center needs to be at anchorX, and ring will be 6*0.7*iconScale to the left
          const anchorCenterX = anchorX;
          const anchorCenterY = anchorSeabedY; // Place anchor at seabed level

          return (
            <g transform={`translate(${anchorCenterX}, ${anchorCenterY}) scale(${iconScale * 0.7}) rotate(-90)`}>
              <circle cx="0" cy="-6" r="3" fill="none" stroke="#fff" strokeWidth="1.5" />
              <line x1="0" y1="-3" x2="0" y2="8" stroke="#fff" strokeWidth="2" />
              <path d="M -6 6 L 0 8 L 6 6" fill="none" stroke="#fff" strokeWidth="2" />
              <line x1="-6" y1="6" x2="-6" y2="2" stroke="#fff" strokeWidth="1.5" />
              <line x1="6" y1="6" x2="6" y2="2" stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })()}

        {/* Chain length label */}
        <text x={svgWidth - 10} y={waterLevel + 15} fill="rgba(255,255,255,0.6)" fontSize="9" textAnchor="end">
          Chain: {chainLength.toFixed(0)}m
        </text>
        </g>
      </svg>

      {/* Scope bar - simplified, full width, hard color stops */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.25rem',
      }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 'bold',
          color: getScopeColor(),
          whiteSpace: 'nowrap',
        }}>
          {scopeRatio.toFixed(1)}:1
        </div>
        <div style={{
          flex: 1,
          height: '6px',
          borderRadius: '3px',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Hard color segments: red | orange | yellow | bright green | green */}
          <div style={{ flex: 1, background: '#ef5350' }} /> {/* 0-20%: < 2.4:1 */}
          <div style={{ flex: 1, background: '#ffa726' }} /> {/* 20-40%: 2.4-3.8:1 */}
          <div style={{ flex: 1, background: '#ffee58' }} /> {/* 40-60%: 3.8-5.2:1 */}
          <div style={{ flex: 1, background: '#9ccc65' }} /> {/* 60-80%: 5.2-6.6:1 */}
          <div style={{ flex: 1, background: '#66bb6a' }} /> {/* 80-100%: > 6.6:1 */}
          {/* Indicator line */}
          <div style={{
            position: 'absolute',
            left: `${getIndicatorPosition()}%`,
            top: '-2px',
            bottom: '-2px',
            width: '2px',
            background: '#fff',
            borderRadius: '1px',
            transform: 'translateX(-50%)',
          }} />
        </div>
      </div>
    </div>
  );
};

// Anchor Alarm Dialog
interface AnchorAlarmDialogProps {
  anchorPosition: { lat: number; lon: number } | null;
  onSetAnchorPosition: () => void;
  onActivate: (chainLength: number, depth: number) => void;
  onClose: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
  chainLength: number;
  onChainLengthChange: (value: number) => void;
  anchorDepth: number;
  onAnchorDepthChange: (value: number) => void;
}

export const AnchorAlarmDialog: React.FC<AnchorAlarmDialogProps> = ({
  anchorPosition,
  onSetAnchorPosition,
  onActivate,
  onClose,
  onDelete,
  isEditing = false,
  chainLength,
  onChainLengthChange,
  anchorDepth,
  onAnchorDepthChange,
}) => {
  const setChainLength = onChainLengthChange;
  const depth = anchorDepth;
  const setDepth = onAnchorDepthChange;

  const canActivate = chainLength > 0 && depth > 0 && chainLength >= depth;

  return (
    <DialogOverlay onClick={onClose}>
      <CloseButton onClick={onClose} />
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        Anchor Alarm
      </div>

      {/* Chain Length Input */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>
          CHAIN OUT (meters)
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
          <button
            onClick={() => setChainLength(Math.max(1, Math.ceil(chainLength) - 1))}
            className="touch-btn"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <input
            type="number"
            value={chainLength}
            onChange={(e) => setChainLength(Math.max(0, parseFloat(e.target.value) || 0))}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '1rem',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setChainLength(Math.floor(chainLength) + 1)}
            className="touch-btn"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Depth Input */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.5rem' }}>
          DEPTH (meters)
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
          <button
            onClick={() => setDepth(Math.max(0.5, Math.ceil(depth) - 1))}
            className="touch-btn"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <input
            type="number"
            step="0.1"
            value={Math.round(depth * 10) / 10}
            onChange={(e) => setDepth(Math.max(0, parseFloat(e.target.value) || 0))}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '1rem',
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setDepth(Math.floor(depth) + 1)}
            className="touch-btn"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Adjust Anchor Position Button */}
      <button
        onClick={onSetAnchorPosition}
        className="touch-btn"
        style={{
          width: '100%',
          marginBottom: '1rem',
          padding: '0.6rem 1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          color: anchorPosition ? '#4fc3f7' : 'rgba(255, 255, 255, 0.7)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        Adjust Anchor Position
      </button>

      {/* Scope Visualization */}
      <ScopeVisualization chainLength={chainLength} depth={depth} />

      {/* Warning if chain < depth */}
      {chainLength < depth && chainLength > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.5rem',
          background: 'rgba(239, 83, 80, 0.2)',
          border: '1px solid rgba(239, 83, 80, 0.4)',
          borderRadius: '4px',
          fontSize: '0.8rem',
          color: '#ef5350',
        }}>
          Chain length must be greater than depth
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={isEditing && onDelete ? onDelete : onClose}
          className="touch-btn"
          style={{
            flex: 1,
            padding: '0.75rem',
            background: isEditing ? 'rgba(239, 83, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            border: isEditing ? '1px solid rgba(239, 83, 80, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: isEditing ? '#ef5350' : '#fff',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {isEditing ? 'Delete' : 'Cancel'}
        </button>
        <button
          onClick={() => canActivate && onActivate(chainLength, depth)}
          disabled={!canActivate}
          className="touch-btn"
          style={{
            flex: 1,
            padding: '0.75rem',
            background: canActivate
              ? 'rgba(79, 195, 247, 0.5)'
              : 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: canActivate ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            opacity: canActivate ? 1 : 0.5,
          }}
        >
          {isEditing ? 'Save' : 'Activate'}
        </button>
      </div>
    </DialogOverlay>
  );
};
