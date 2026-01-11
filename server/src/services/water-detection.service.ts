/**
 * Water Detection Service
 *
 * Uses OSM polygon data to determine if a coordinate is on water or land.
 * Supports direct reading of:
 * - Shapefile (.shp) for OSM Water Polygons (oceans/seas) - using spatial index for efficiency
 * - PBF for OSM Water Layer (lakes, rivers, reservoirs)
 *
 * For large shapefiles (>100MB), uses R-tree spatial indexing with on-demand
 * feature loading to avoid memory issues. Only bounding boxes are kept in memory,
 * and full polygon geometry is read from disk only when needed for point-in-polygon tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as shapefile from 'shapefile';
import { ShapefileSpatialIndex } from './shapefile-spatial-index';

interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export type WaterType = 'ocean' | 'lake' | 'land';

class WaterDetectionService {
  private waterPolygons: GeoJSONFeatureCollection | null = null; // OSM oceans/seas (small files)
  private waterSpatialIndex: ShapefileSpatialIndex | null = null; // OSM oceans/seas (large files)
  private lakePolygons: GeoJSONFeatureCollection | null = null;  // OSM lakes/rivers
  private cache = new Map<string, WaterType>();
  private readonly CACHE_SIZE = 100000; // Increased for high-resolution route checking
  private initialized = false;
  private useSpatialIndex = false; // True if using spatial index for water polygons

  /**
   * Initialize the service by loading data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const dataDir = path.join(__dirname, '..', 'data');

    try {
      console.log('Loading water detection data...');

      // Load OSM Water Polygons (oceans/seas) from Shapefile
      await this.loadWaterPolygons(dataDir);

      // Load OSM Water Layer (lakes/rivers) from PBF or GeoJSON
      await this.loadLakePolygons(dataDir);

      // Log data source summary
      console.log('Water detection data sources:');
      if (this.useSpatialIndex && this.waterSpatialIndex) {
        const stats = this.waterSpatialIndex.getStats();
        console.log(`  - OSM Water Polygons: ${stats.featureCount} features (oceans/seas) [spatial index]`);
      } else if (this.waterPolygons) {
        console.log(`  - OSM Water Polygons: ${this.waterPolygons.features.length} features (oceans/seas)`);
      }
      if (this.lakePolygons) console.log(`  - OSM Water Layer: ${this.lakePolygons.features.length} features (lakes/rivers)`);

      if (!this.waterPolygons && !this.waterSpatialIndex && !this.lakePolygons) {
        console.warn('  No water detection data loaded!');
        console.warn('  Place oceans-seas/ folder or OSM_WaterLayer.pbf in server/src/data/');
      }

      this.initialized = true;
      console.log('Water detection service ready');
    } catch (error) {
      console.error('Failed to load water detection data:', error);
    }
  }

  /**
   * Load OSM Water Polygons from Shapefile
   * For large shapefiles (>100MB), uses R-tree spatial indexing with on-demand loading.
   * For smaller files, loads everything into memory for faster queries.
   */
  private async loadWaterPolygons(dataDir: string): Promise<void> {
    // Check for oceans-seas folder first (new location)
    let shpPath = path.join(dataDir, 'oceans-seas', 'water_polygons.shp');

    // Fallback to old location
    if (!fs.existsSync(shpPath)) {
      shpPath = path.join(dataDir, 'water-polygons-split-4326', 'water_polygons.shp');
    }

    if (fs.existsSync(shpPath)) {
      const stats = fs.statSync(shpPath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > 100) {
        // Large file: use spatial index with on-demand loading
        console.log(`  Loading large shapefile (${sizeMB.toFixed(0)}MB) with spatial indexing...`);
        this.waterSpatialIndex = new ShapefileSpatialIndex();
        await this.waterSpatialIndex.initialize(shpPath);
        this.useSpatialIndex = true;
        console.log(`  Spatial index ready (memory-efficient mode)`);
        return;
      } else {
        // Small file: load into memory for faster queries
        console.log('  Loading OSM Water Polygons from Shapefile...');
        const features: GeoJSONFeature[] = [];

        const source = await shapefile.open(shpPath);
        let result = await source.read();

        while (!result.done) {
          if (result.value && result.value.geometry) {
            features.push(result.value as GeoJSONFeature);
          }
          result = await source.read();
        }

        this.waterPolygons = {
          type: 'FeatureCollection',
          features
        };
        console.log(`  Loaded ${features.length} water polygon features`);
        return;
      }
    }

    // Fallback: check for pre-converted GeoJSON
    const jsonPath = path.join(dataDir, 'water-polygons.json');
    if (fs.existsSync(jsonPath)) {
      console.log('  Loading water polygons from GeoJSON...');
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      this.waterPolygons = JSON.parse(raw);
      console.log(`  Loaded ${this.waterPolygons?.features.length} features`);
      return;
    }

    // Legacy fallback: Natural Earth ocean data
    const oceanPath = path.join(dataDir, 'ocean.json');
    if (fs.existsSync(oceanPath)) {
      console.log('  Loading Natural Earth ocean data (fallback)...');
      const raw = fs.readFileSync(oceanPath, 'utf-8');
      this.waterPolygons = JSON.parse(raw);
      console.log(`  Loaded ${this.waterPolygons?.features.length} features`);
    }
  }

  /**
   * Load OSM Water Layer (lakes/rivers) from PBF or GeoJSON
   */
  private async loadLakePolygons(dataDir: string): Promise<void> {
    // Check for PBF file
    const pbfPath = path.join(dataDir, 'OSM_WaterLayer.pbf');

    if (fs.existsSync(pbfPath)) {
      console.log('  Loading OSM Water Layer from PBF...');
      try {
        const tinyOsmPbf = await import('tiny-osmpbf');
        const osmtogeojson = (await import('osmtogeojson')).default;

        const pbfBuffer = fs.readFileSync(pbfPath);
        const osmData = tinyOsmPbf.parse(pbfBuffer);
        this.lakePolygons = osmtogeojson(osmData) as GeoJSONFeatureCollection;
        console.log(`  Loaded ${this.lakePolygons.features.length} lake/river features`);
        return;
      } catch (error) {
        console.error('  Failed to load PBF:', error);
      }
    }

    // Fallback: check for pre-converted GeoJSON
    const jsonPath = path.join(dataDir, 'osm-water.json');
    if (fs.existsSync(jsonPath)) {
      console.log('  Loading OSM water layer from GeoJSON...');
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      this.lakePolygons = JSON.parse(raw);
      console.log(`  Loaded ${this.lakePolygons?.features.length} features`);
      return;
    }

    // Legacy fallback: Natural Earth lakes data
    const lakesPath = path.join(dataDir, 'lakes.json');
    if (fs.existsSync(lakesPath)) {
      console.log('  Loading Natural Earth lakes data (legacy fallback)...');
      const raw = fs.readFileSync(lakesPath, 'utf-8');
      this.lakePolygons = JSON.parse(raw);
      console.log(`  Loaded ${this.lakePolygons?.features.length} features`);
    }
  }

  /**
   * Ray-casting algorithm to determine if a point is inside a polygon.
   */
  private pointInPolygon(lat: number, lon: number, polygon: number[][]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i][0]; // longitude
      const yi = polygon[i][1]; // latitude
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      if (((yi > lat) !== (yj > lat)) &&
          (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Check if a point is inside any polygon in a feature collection
   */
  private isPointInFeatureCollection(
    lat: number,
    lon: number,
    data: GeoJSONFeatureCollection
  ): boolean {
    for (const feature of data.features) {
      const geometry = feature.geometry;

      if (geometry.type === 'Polygon') {
        const outerRing = geometry.coordinates[0];
        if (this.pointInPolygon(lat, lon, outerRing)) {
          // Check holes
          for (let i = 1; i < geometry.coordinates.length; i++) {
            if (this.pointInPolygon(lat, lon, geometry.coordinates[i])) {
              return false;
            }
          }
          return true;
        }
      } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
          const outerRing = polygon[0];
          if (this.pointInPolygon(lat, lon, outerRing)) {
            // Check holes
            for (let i = 1; i < polygon.length; i++) {
              if (this.pointInPolygon(lat, lon, polygon[i])) {
                return false;
              }
            }
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get the water type at a coordinate.
   */
  getWaterType(lat: number, lon: number): WaterType {
    if (!this.initialized) {
      console.warn('Water detection service not initialized');
      return 'land';
    }

    // Round for caching (~11m precision)
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLon = Math.round(lon * 10000) / 10000;
    const cacheKey = `${roundedLat},${roundedLon}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Determine water type
    let result: WaterType = 'land';

    // Check ocean/sea first (using spatial index if available)
    if (this.useSpatialIndex && this.waterSpatialIndex) {
      if (this.waterSpatialIndex.containsPoint(lon, lat)) {
        result = 'ocean';
      }
    } else if (this.waterPolygons && this.isPointInFeatureCollection(lat, lon, this.waterPolygons)) {
      result = 'ocean';
    }

    // Check lakes/rivers (only if not already in ocean)
    if (result === 'land' && this.lakePolygons && this.isPointInFeatureCollection(lat, lon, this.lakePolygons)) {
      result = 'lake';
    }

    // Cache result
    if (this.cache.size >= this.CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * Check if a coordinate is on water
   */
  isWater(lat: number, lon: number): boolean {
    const type = this.getWaterType(lat, lon);
    return type === 'ocean' || type === 'lake';
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_SIZE
    };
  }

  /**
   * Get water classification grid for a bounding box (for debug overlay)
   * Returns a grid of points with their water classification
   */
  getWaterGrid(
    minLat: number,
    maxLat: number,
    minLon: number,
    maxLon: number,
    gridSize: number = 0.005 // ~500m default resolution
  ): Array<{ lat: number; lon: number; type: WaterType }> {
    if (!this.initialized) {
      return [];
    }

    const points: Array<{ lat: number; lon: number; type: WaterType }> = [];

    // Limit grid to prevent excessive computation
    const maxPoints = 2500; // 50x50 max grid
    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    // Adjust grid size if needed to stay within limits
    const latSteps = Math.ceil(latRange / gridSize);
    const lonSteps = Math.ceil(lonRange / gridSize);
    const totalPoints = latSteps * lonSteps;

    let effectiveGridSize = gridSize;
    if (totalPoints > maxPoints) {
      // Increase grid size to stay within limits
      effectiveGridSize = Math.sqrt((latRange * lonRange) / maxPoints);
    }

    for (let lat = minLat; lat <= maxLat; lat += effectiveGridSize) {
      for (let lon = minLon; lon <= maxLon; lon += effectiveGridSize) {
        const type = this.getWaterType(lat, lon);
        points.push({ lat, lon, type });
      }
    }

    return points;
  }

  /**
   * Check if using spatial index mode
   */
  isUsingSpatialIndex(): boolean {
    return this.useSpatialIndex;
  }

  /**
   * Calculate distance between two points in nautical miles (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if a straight line between two points crosses land
   * Uses high-resolution sampling (~11m, matching cache precision) to detect small islands
   *
   * @param startLat Starting latitude
   * @param startLon Starting longitude
   * @param endLat Ending latitude
   * @param endLon Ending longitude
   * @param collectAllPoints If true, collects all land points; if false, returns early on first land
   */
  checkRouteForLand(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    collectAllPoints: boolean = false
  ): { crossesLand: boolean; landPoints: Array<{ lat: number; lon: number }> } {
    // Calculate distance in meters
    const distanceNm = this.calculateDistance(startLat, startLon, endLat, endLon);
    const distanceMeters = distanceNm * 1852;

    // Sample at ~11m intervals (matching cache precision of 0.0001°)
    // This ensures we don't miss small islands
    const sampleIntervalMeters = 11;
    const numSamples = Math.max(Math.ceil(distanceMeters / sampleIntervalMeters), 2);

    const landPoints: Array<{ lat: number; lon: number }> = [];

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const lat = startLat + t * (endLat - startLat);
      const lon = startLon + t * (endLon - startLon);

      if (!this.isWater(lat, lon)) {
        landPoints.push({ lat, lon });
        // Early termination if we only need to know if it crosses land
        if (!collectAllPoints) {
          return { crossesLand: true, landPoints };
        }
      }
    }

    return {
      crossesLand: landPoints.length > 0,
      landPoints
    };
  }

  /**
   * Find a nearby water cell on the grid
   */
  private findNearbyWaterCell(
    lat: number,
    lon: number,
    gridSize: number,
    maxSearchRadius: number = 5
  ): { lat: number; lon: number } | null {
    // First check if the exact grid-snapped position is water
    const snappedLat = Math.round(lat / gridSize) * gridSize;
    const snappedLon = Math.round(lon / gridSize) * gridSize;

    if (this.isWater(snappedLat, snappedLon)) {
      return { lat: snappedLat, lon: snappedLon };
    }

    // Search in expanding rings around the point
    for (let radius = 1; radius <= maxSearchRadius; radius++) {
      for (let dLat = -radius; dLat <= radius; dLat++) {
        for (let dLon = -radius; dLon <= radius; dLon++) {
          // Only check the perimeter of this ring
          if (Math.abs(dLat) !== radius && Math.abs(dLon) !== radius) continue;

          const testLat = snappedLat + dLat * gridSize;
          const testLon = snappedLon + dLon * gridSize;

          if (this.isWater(testLat, testLon)) {
            return { lat: testLat, lon: testLon };
          }
        }
      }
    }

    return null;
  }

  /**
   * Find a water-only route between two points using multi-resolution A* pathfinding
   *
   * Strategy:
   * 1. First try direct route with high-resolution (~11m) land detection
   * 2. If blocked, use coarse A* (~100m) to find general path around obstacles
   * 3. Validate and refine path segments with high-resolution checks
   * 4. If coarse path fails, retry with finer grid
   *
   * This ensures we never miss small islands while keeping computation tractable
   */
  findWaterRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    maxIterations: number = 50000
  ): { success: boolean; waypoints: Array<{ lat: number; lon: number }>; distance: number } {
    // Log input coordinates for debugging
    const startWater = this.isWater(startLat, startLon);
    const endWater = this.isWater(endLat, endLon);
    console.log(`Route request: (${startLat.toFixed(5)}, ${startLon.toFixed(5)}) -> (${endLat.toFixed(5)}, ${endLon.toFixed(5)})`);
    console.log(`  Start on water: ${startWater}, End on water: ${endWater}`);

    // First check if direct route is possible with high-resolution (~11m) checking
    const directCheck = this.checkRouteForLand(startLat, startLon, endLat, endLon, false);
    if (!directCheck.crossesLand) {
      console.log(`  Direct route is clear (verified at ~11m resolution)`);
      return {
        success: true,
        waypoints: [
          { lat: startLat, lon: startLon },
          { lat: endLat, lon: endLon }
        ],
        distance: this.calculateDistance(startLat, startLon, endLat, endLon)
      };
    }

    console.log(`  Direct route crosses land, starting multi-resolution pathfinding`);

    // Try progressively finer grids until we find a valid route
    // Start with coarse grid for efficiency, fall back to finer grids if needed
    const gridSizes = [
      0.001,   // ~111m - coarse, fast initial search
      0.0005,  // ~55m - medium resolution
      0.0002,  // ~22m - fine resolution
      0.0001   // ~11m - maximum resolution (matches cache precision)
    ];

    for (const gridSize of gridSizes) {
      console.log(`  Trying grid size: ${gridSize.toFixed(5)}° (~${(gridSize * 111000).toFixed(0)}m)`);

      const result = this.runAStar(
        startLat, startLon, endLat, endLon,
        gridSize, maxIterations
      );

      if (result.success) {
        // Validate the found path at high resolution (~11m)
        const validatedPath = this.validateAndRefinePath(result.waypoints);
        if (validatedPath.success) {
          console.log(`Water route found: ${validatedPath.waypoints.length} waypoints, ${validatedPath.distance.toFixed(1)} NM`);
          return validatedPath;
        }
        console.log(`  Path found but failed high-resolution validation, trying finer grid`);
      } else {
        console.log(`  No path found at this resolution, trying finer grid`);
      }
    }

    // All grid sizes failed
    console.warn(`Water route pathfinding failed at all resolutions`);
    return {
      success: false,
      waypoints: [
        { lat: startLat, lon: startLon },
        { lat: endLat, lon: endLon }
      ],
      distance: this.calculateDistance(startLat, startLon, endLat, endLon)
    };
  }

  /**
   * Run A* pathfinding at a specific grid resolution
   */
  private runAStar(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    gridSize: number,
    maxIterations: number
  ): { success: boolean; waypoints: Array<{ lat: number; lon: number }>; distance: number } {
    // Find valid water cells near start and end points
    const startNode = this.findNearbyWaterCell(startLat, startLon, gridSize);
    const endNode = this.findNearbyWaterCell(endLat, endLon, gridSize);

    if (!startNode) {
      return {
        success: false,
        waypoints: [{ lat: startLat, lon: startLon }, { lat: endLat, lon: endLon }],
        distance: this.calculateDistance(startLat, startLon, endLat, endLon)
      };
    }

    if (!endNode) {
      return {
        success: false,
        waypoints: [{ lat: startLat, lon: startLon }, { lat: endLat, lon: endLon }],
        distance: this.calculateDistance(startLat, startLon, endLat, endLon)
      };
    }

    // Store all visited nodes with their data for path reconstruction
    const allNodes = new Map<string, {
      lat: number;
      lon: number;
      g: number;
      f: number;
      parent: string | null;
    }>();

    const openSet = new Set<string>();
    const closedSet = new Set<string>();

    const getKey = (lat: number, lon: number) => `${lat.toFixed(6)},${lon.toFixed(6)}`;
    const heuristic = (lat: number, lon: number) =>
      this.calculateDistance(lat, lon, endNode.lat, endNode.lon);

    const startKey = getKey(startNode.lat, startNode.lon);
    allNodes.set(startKey, {
      lat: startNode.lat,
      lon: startNode.lon,
      g: 0,
      f: heuristic(startNode.lat, startNode.lon),
      parent: null
    });
    openSet.add(startKey);

    // Direction vectors (8 directions)
    const directions = [
      [gridSize, 0], [-gridSize, 0], [0, gridSize], [0, -gridSize],
      [gridSize, gridSize], [gridSize, -gridSize], [-gridSize, gridSize], [-gridSize, -gridSize]
    ];

    let iterations = 0;
    let foundPath = false;
    let goalKey = '';

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest f score
      let currentKey = '';
      let lowestF = Infinity;
      for (const key of openSet) {
        const node = allNodes.get(key)!;
        if (node.f < lowestF) {
          lowestF = node.f;
          currentKey = key;
        }
      }

      const current = allNodes.get(currentKey)!;
      openSet.delete(currentKey);
      closedSet.add(currentKey);

      // Check if we reached the goal
      if (this.calculateDistance(current.lat, current.lon, endNode.lat, endNode.lon) < gridSize * 2) {
        foundPath = true;
        goalKey = currentKey;
        break;
      }

      // Explore neighbors
      for (const [dLat, dLon] of directions) {
        const newLat = Math.round((current.lat + dLat) / gridSize) * gridSize;
        const newLon = Math.round((current.lon + dLon) / gridSize) * gridSize;
        const newKey = getKey(newLat, newLon);

        if (closedSet.has(newKey)) continue;
        if (!this.isWater(newLat, newLon)) continue;

        const tentativeG = current.g + this.calculateDistance(current.lat, current.lon, newLat, newLon);

        const existing = allNodes.get(newKey);
        if (!existing || tentativeG < existing.g) {
          allNodes.set(newKey, {
            lat: newLat,
            lon: newLon,
            g: tentativeG,
            f: tentativeG + heuristic(newLat, newLon),
            parent: currentKey
          });
          openSet.add(newKey);
        }
      }
    }

    if (foundPath) {
      // Reconstruct path from goal to start
      const path: Array<{ lat: number; lon: number }> = [];
      let currentKey: string | null = goalKey;

      while (currentKey) {
        const node = allNodes.get(currentKey);
        if (node) {
          path.unshift({ lat: node.lat, lon: node.lon });
          currentKey = node.parent;
        } else {
          break;
        }
      }

      // Add actual start and end points
      path.unshift({ lat: startLat, lon: startLon });
      path.push({ lat: endLat, lon: endLon });

      // Calculate total distance
      let totalDist = 0;
      for (let i = 1; i < path.length; i++) {
        totalDist += this.calculateDistance(
          path[i - 1].lat, path[i - 1].lon,
          path[i].lat, path[i].lon
        );
      }

      return { success: true, waypoints: path, distance: totalDist };
    }

    return {
      success: false,
      waypoints: [{ lat: startLat, lon: startLon }, { lat: endLat, lon: endLon }],
      distance: this.calculateDistance(startLat, startLon, endLat, endLon)
    };
  }

  /**
   * Validate a path at high resolution (~11m) and refine if needed
   * This ensures no small islands are missed between waypoints
   */
  private validateAndRefinePath(
    path: Array<{ lat: number; lon: number }>
  ): { success: boolean; waypoints: Array<{ lat: number; lon: number }>; distance: number } {
    if (path.length < 2) {
      return { success: false, waypoints: path, distance: 0 };
    }

    const refinedPath: Array<{ lat: number; lon: number }> = [path[0]];

    // Check each segment at high resolution
    for (let i = 1; i < path.length; i++) {
      const prev = refinedPath[refinedPath.length - 1];
      const curr = path[i];

      // Check segment with high-resolution land detection
      const check = this.checkRouteForLand(prev.lat, prev.lon, curr.lat, curr.lon, false);

      if (check.crossesLand) {
        // Segment crosses land - this means the coarse path missed something
        // Try to find a micro-route around the obstacle
        const microRoute = this.runAStar(
          prev.lat, prev.lon, curr.lat, curr.lon,
          0.0001, // ~11m resolution
          10000   // Limited iterations for micro-routing
        );

        if (microRoute.success && !this.pathCrossesLand(microRoute.waypoints)) {
          // Add micro-route waypoints (skip first as it's already in refinedPath)
          for (let j = 1; j < microRoute.waypoints.length; j++) {
            refinedPath.push(microRoute.waypoints[j]);
          }
        } else {
          // Cannot find valid micro-route - path validation failed
          return { success: false, waypoints: path, distance: 0 };
        }
      } else {
        refinedPath.push(curr);
      }
    }

    // Simplify the refined path
    const simplified = this.simplifyPath(refinedPath);

    // Calculate total distance
    let totalDist = 0;
    for (let i = 1; i < simplified.length; i++) {
      totalDist += this.calculateDistance(
        simplified[i - 1].lat, simplified[i - 1].lon,
        simplified[i].lat, simplified[i].lon
      );
    }

    return { success: true, waypoints: simplified, distance: totalDist };
  }

  /**
   * Check if any segment of a path crosses land at high resolution
   */
  private pathCrossesLand(path: Array<{ lat: number; lon: number }>): boolean {
    for (let i = 1; i < path.length; i++) {
      const check = this.checkRouteForLand(
        path[i - 1].lat, path[i - 1].lon,
        path[i].lat, path[i].lon,
        false
      );
      if (check.crossesLand) return true;
    }
    return false;
  }

  /**
   * Check if a direct line between two points crosses land (fine-grained check)
   * Checks every ~15 meters for small islands (balances accuracy vs performance)
   */
  private isDirectRouteWater(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): boolean {
    const distMeters = this.calculateDistance(lat1, lon1, lat2, lon2) * 1852; // NM to meters
    const checkPoints = Math.max(2, Math.ceil(distMeters / 15)); // Check every ~15m

    for (let i = 0; i <= checkPoints; i++) {
      const t = i / checkPoints;
      const lat = lat1 + t * (lat2 - lat1);
      const lon = lon1 + t * (lon2 - lon1);
      if (!this.isWater(lat, lon)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Simplify a path by removing unnecessary waypoints
   */
  private simplifyPath(path: Array<{ lat: number; lon: number }>): Array<{ lat: number; lon: number }> {
    if (path.length <= 2) return path;

    const result: Array<{ lat: number; lon: number }> = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = result[result.length - 1];
      const next = path[i + 1];

      // Check if we can skip this waypoint (direct route is all water)
      if (!this.isDirectRouteWater(prev.lat, prev.lon, next.lat, next.lon)) {
        result.push(path[i]);
      }
    }

    result.push(path[path.length - 1]);
    return result;
  }
}

export const waterDetectionService = new WaterDetectionService();
