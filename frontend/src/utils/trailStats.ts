import length from '@turf/length';
import { lineString } from '@turf/helpers';

function calculateElevationStats(coordinates: number[][]) {
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxEle = 0; 
  let minEle = 0; 
  
  if (coordinates.length < 2) return { elevationGain, elevationLoss, maxEle, minEle };

  if (coordinates[0].length >= 3) {
    maxEle = coordinates[0][2];
    minEle = coordinates[0][2];
  }

  for (let i = 1; i < coordinates.length; i++) {
    const currentPoint = coordinates[i];
    const previousPoint = coordinates[i - 1];

    if (currentPoint.length >= 3 && previousPoint.length >= 3) {
      const currentEle = currentPoint[2];
      const previousEle = previousPoint[2];
      const diff = currentEle - previousEle;

      if (diff > 0) {
        elevationGain += diff; 
      } else if (diff < 0) {
        elevationLoss += Math.abs(diff);
      }
      
      if (currentEle > maxEle) maxEle = currentEle;
      if (currentEle < minEle) minEle = currentEle;
    }
  }

  return { elevationGain, elevationLoss, maxEle, minEle };
}

export function calculateTrailStats(geoJsonData: any) {
  const coordinates = geoJsonData?.features?.[0]?.geometry?.coordinates;
  
  if (!coordinates || coordinates.length === 0) {
    throw new Error("Unable to extract coordinates from GeoJSON");
  }

  const routeLine = lineString(coordinates);
  const totalDistance = length(routeLine, { units: 'kilometers' });
  const elevationStats = calculateElevationStats(coordinates);

  return {
    distanceKm: Number(totalDistance.toFixed(2)),
    elevationGain: Number(elevationStats.elevationGain.toFixed(2)),
    elevationLoss: Number(elevationStats.elevationLoss.toFixed(2)),
    maxAltitude: Number(elevationStats.maxEle.toFixed(2)),
    minAltitude: Number(elevationStats.minEle.toFixed(2))
  };
}