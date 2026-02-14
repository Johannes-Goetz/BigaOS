/**
 * Simplified magnetic declination based on geomagnetic dipole model.
 *
 * Uses the geomagnetic North Pole position (WMM 2025 epoch):
 *   Latitude: ~80.7°N, Longitude: ~-72.7°W
 *
 * Accuracy: ~2-5° for most maritime areas. Good enough for
 * automatic magnetic→true heading conversion when no external
 * true heading source is available.
 *
 * @param latDeg - Latitude in decimal degrees
 * @param lonDeg - Longitude in decimal degrees
 * @returns Magnetic declination in radians (positive = east)
 */
export function getMagneticDeclination(latDeg: number, lonDeg: number): number {
  const DEG_TO_RAD = Math.PI / 180;

  // Geomagnetic North Pole (WMM 2025 epoch)
  const poleLat = 80.7 * DEG_TO_RAD;
  const poleLon = -72.7 * DEG_TO_RAD;

  const lat = latDeg * DEG_TO_RAD;
  const lon = lonDeg * DEG_TO_RAD;

  // Declination from dipole model
  const num = Math.sin(poleLon - lon) * Math.cos(poleLat);
  const den = Math.cos(lat) * Math.sin(poleLat) -
              Math.sin(lat) * Math.cos(poleLat) * Math.cos(poleLon - lon);

  return Math.atan2(num, den);
}
