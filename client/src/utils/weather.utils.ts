/**
 * Shared weather utility functions
 */

/**
 * Interpolate between two RGB colors
 */
function interpolateColor(color1: number[], color2: number[], factor: number): number[] {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * factor),
    Math.round(color1[1] + (color2[1] - color1[1]) * factor),
    Math.round(color1[2] + (color2[2] - color1[2]) * factor),
  ];
}

/**
 * Get color based on wind speed in knots with distinct color bands
 */
export function getWindColor(speedKt: number): string {
  // Color stops: [speed, [r, g, b]]
  // More distinct, vibrant colors for each Beaufort-like category
  const colorStops: Array<[number, number[]]> = [
    [0, [135, 206, 250]],   // Sky blue (calm)
    [10, [50, 205, 50]],    // Lime green (moderate)
    [20, [255, 215, 0]],    // Gold (fresh)
    [30, [255, 140, 0]],    // Dark orange (strong)
    [40, [220, 20, 60]],    // Crimson (gale)
    [50, [139, 0, 0]],      // Dark red (storm)
  ];

  // Clamp speed to valid range
  const clampedSpeed = Math.max(0, Math.min(speedKt, colorStops[colorStops.length - 1][0]));

  // Find the two color stops to interpolate between
  for (let i = 0; i < colorStops.length - 1; i++) {
    const [speed1, color1] = colorStops[i];
    const [speed2, color2] = colorStops[i + 1];

    if (clampedSpeed >= speed1 && clampedSpeed <= speed2) {
      // Calculate interpolation factor (0 to 1)
      const factor = (clampedSpeed - speed1) / (speed2 - speed1);
      const rgb = interpolateColor(color1, color2, factor);
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }

  // Fallback (shouldn't happen due to clamping)
  const lastColor = colorStops[colorStops.length - 1][1];
  return `rgb(${lastColor[0]}, ${lastColor[1]}, ${lastColor[2]})`;
}

/**
 * Format wind direction as compass point
 */
export function formatWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
