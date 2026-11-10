import length from '@turf/length';
import turfDistance from '@turf/distance';
import { ELEV_THRESHOLD } from '../config/trails.config.js';

const DISTANCE_OPTIONS = { units: 'kilometers' };

function calculateElevationStats(coordinates) {
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxEle = null; 
  let minEle = null;
  let lastSignificantEle = null; 
  
  if (coordinates.length < 2) return { elevationGain, elevationLoss, maxEle, minEle };

  for (let i = 0; i < coordinates.length; i++) {
    const point = coordinates[i];

    if (point.length < 3 || typeof point[2] !== 'number') continue;

    const currentEle = point[2];

    if (maxEle === null || currentEle > maxEle) maxEle = currentEle;
    if (minEle === null || currentEle < minEle) minEle = currentEle;
    
    //elevation with filter for GPS jitter
    if (lastSignificantEle === null) {
      lastSignificantEle = currentEle;
    } else {
      const diff = currentEle - lastSignificantEle;
      if (Math.abs(diff) >= ELEV_THRESHOLD) {
        if (diff > 0) {
          elevationGain += diff;
        } else {
          elevationLoss += Math.abs(diff);
        }
        lastSignificantEle = currentEle;
      }
    }
  }
  return { elevationGain, elevationLoss, maxEle, minEle };
}

// Valori del grafico arrotondati; somma delle distanze e coordinate originali mantengono la precisione.
export function buildElevationProfile(geoJsonData) {
  const geometry = geoJsonData?.type === 'FeatureCollection'
    ? geoJsonData.features?.[0]?.geometry
    : geoJsonData?.type === 'Feature' ? geoJsonData.geometry : geoJsonData;
  const segments = geometry?.type === 'LineString'
    ? [geometry.coordinates]
    : geometry?.type === 'MultiLineString' ? geometry.coordinates : [];

  const profile = [];
  let distance = 0;

  for (const segment of segments) {
    let previous = null;

    for (const coordinates of segment) {
      const [longitude, latitude, elevation] = coordinates ?? [];
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        previous = null;
        continue;
      }

      if (previous) {
        distance += turfDistance(previous, coordinates, DISTANCE_OPTIONS);
      }
      previous = coordinates;

      if (Number.isFinite(elevation)) {
        profile.push({
          distance: Math.round(distance * 1000) / 1000,
          elevation: Math.round(elevation * 10) / 10,
          coordinates,
        });
      }
    }
  }

  return profile;
}

export function calculateTrailStats(geoJsonData) {
  if (!geoJsonData) throw new Error("Unable to extract coordinates");

  let geometry = null;

  //FeatureCollection, not only Single Feature
  if (geoJsonData.type === 'FeatureCollection' && geoJsonData.features?.length > 0) {
    geometry = geoJsonData.features[0].geometry;
  } else if (geoJsonData.type === 'Feature') {
    geometry = geoJsonData.geometry;
  } else if (geoJsonData.type === 'LineString' || geoJsonData.type === 'MultiLineString') {
    geometry = geoJsonData;
  }

  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {throw new Error("Unable to extract coordinates");}

  //Flattens MultiLineStrings so that you can iterate over the individual points
  let flatCoordinates = [];
  if (geometry.type === 'LineString') {
    flatCoordinates = geometry.coordinates;
  } else if (geometry.type === 'MultiLineString') {
    flatCoordinates = geometry.coordinates.flat();
  }

  if (flatCoordinates.length < 2) {throw new Error("Unable to extract coordinates");}

  const totalDistance = length(geometry, { units: 'kilometers' });
  const elevationStats = calculateElevationStats(flatCoordinates);

  return {
    distanceKm: Number(totalDistance.toFixed(2)),
    elevationGain: Number(elevationStats.elevationGain.toFixed(2)),
    elevationLoss: Number(elevationStats.elevationLoss.toFixed(2)),
    maxAltitude: elevationStats.maxEle !== null ? Number(elevationStats.maxEle.toFixed(2)) : null,
    minAltitude: elevationStats.minEle !== null ? Number(elevationStats.minEle.toFixed(2)) : null
  };
}
