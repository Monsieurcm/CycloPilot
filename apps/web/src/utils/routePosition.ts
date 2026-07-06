import type { GPXPoint } from "@cyclopilot/shared";

export function getCurrentPoint(
  route: GPXPoint[],
  progress: number,
): GPXPoint | null {
  if (route.length === 0) {
    return null;
  }

  if (progress <= 0) {
    return route[0];
  }

  if (progress >= 1) {
    return route[route.length - 1];
  }

  const lastDistance = route[route.length - 1].distance ?? 0;
  const targetDistance = lastDistance * progress;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];

    const aDistance = a.distance ?? 0;
    const bDistance = b.distance ?? aDistance;

    if (
      targetDistance >= aDistance &&
      targetDistance <= bDistance
    ) {
      const span = bDistance - aDistance;

      if (span <= 0) {
        return a;
      }

      const t = (targetDistance - aDistance) / span;

      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
        elevation:
          a.elevation +
          (b.elevation - a.elevation) * t,
        distance: targetDistance,
      };
    }
  }

  return route[route.length - 1];
}
