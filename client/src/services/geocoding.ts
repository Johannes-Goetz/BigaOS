// Geocoding service using Photon (OpenStreetMap-based, CORS-enabled)

export interface SearchResult {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class?: string;
  importance?: number;
  icon?: string;
  boundingbox?: string[];
  // Photon-specific fields
  osm_id?: number;
  osm_type?: string;
  osm_key?: string;
  osm_value?: string;
  name?: string;
  city?: string;
  country?: string;
}

export interface GeocodingConfig {
  nominatimUrl: string;
  userAgent: string;
  language: string;
}

const defaultConfig: GeocodingConfig = {
  nominatimUrl: 'https://photon.komoot.io',
  userAgent: 'BigaOS/1.0',
  language: 'en',
};

export class GeocodingService {
  private config: GeocodingConfig;

  constructor(config?: Partial<GeocodingConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Search for locations by query
   * @param query - Search query (e.g., "Hamburg harbor", "Lake Como")
   * @param options - Additional search options
   */
  async search(query: string, options?: {
    limit?: number;
    countrycodes?: string; // e.g., "de,nl,dk"
    bounded?: boolean;
    viewbox?: string; // e.g., "left,top,right,bottom"
  }): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: (options?.limit || 10).toString(),
      lang: this.config.language,
    });

    if (options?.viewbox) {
      params.append('bbox', options.viewbox);
    }

    try {
      const response = await fetch(
        `${this.config.nominatimUrl}/api?${params.toString()}`,
        {
          headers: {
            'Accept-Language': this.config.language,
            'User-Agent': this.config.userAgent,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: any = await response.json();

      // Photon returns GeoJSON format with features array
      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }

      // Transform Photon's GeoJSON response to SearchResult format
      const results: SearchResult[] = data.features.map((feature: any) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0];

        return {
          lat: coords[1].toString(),
          lon: coords[0].toString(),
          display_name: props.name || props.street || 'Unknown location',
          type: props.type || 'unknown',
          osm_id: props.osm_id,
          osm_type: props.osm_type,
          osm_key: props.osm_key,
          osm_value: props.osm_value,
          name: props.name,
          city: props.city,
          country: props.country,
        };
      });

      return results;
    } catch (error) {
      console.error('Geocoding search error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode - get location info from coordinates
   * @param lat - Latitude
   * @param lon - Longitude
   */
  async reverse(lat: number, lon: number): Promise<SearchResult | null> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      lang: this.config.language,
    });

    try {
      const response = await fetch(
        `${this.config.nominatimUrl}/reverse?${params.toString()}`,
        {
          headers: {
            'Accept-Language': this.config.language,
            'User-Agent': this.config.userAgent,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.statusText}`);
      }

      const data: any = await response.json();

      // Photon returns GeoJSON format with features array
      if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
        return null;
      }

      // Transform first result to SearchResult format
      const feature = data.features[0];
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [lon, lat];

      return {
        lat: coords[1].toString(),
        lon: coords[0].toString(),
        display_name: props.name || props.street || 'Unknown location',
        type: props.type || 'unknown',
        osm_id: props.osm_id,
        osm_type: props.osm_type,
        osm_key: props.osm_key,
        osm_value: props.osm_value,
        name: props.name,
        city: props.city,
        country: props.country,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<GeocodingConfig>) {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();
