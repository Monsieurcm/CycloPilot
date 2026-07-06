function isValidElevation(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function calculateSegmentGradient(currentPoint, nextPoint) {
  if (!isValidElevation(currentPoint.elevation) || !isValidElevation(nextPoint.elevation)) {
    return null;
  }

  const currentDistance = currentPoint.distance ?? 0;
  const nextDistance = nextPoint.distance ?? 0;
  const distanceDelta = nextDistance - currentDistance;

  if (distanceDelta <= 0) {
    return null;
  }

  return ((nextPoint.elevation - currentPoint.elevation) / distanceDelta) * 100;
}

function smoothGradient(gradients, index, smoothingRadius) {
  if (gradients[index] === null) {
    return 0;
  }

  const values = [];

  for (let offset = -smoothingRadius; offset <= smoothingRadius; offset++) {
    const candidate = gradients[index + offset];

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      values.push(candidate);
    }
  }

  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

export function applyRouteGradients(points, options = {}) {
  if (points.length === 0) {
    return [];
  }

  const smoothingRadius = options.smoothingRadius ?? 1;
  const rawGradients = points.map((point, index) => {
    const nextPoint = points[index + 1];

    if (!nextPoint) {
      return null;
    }

    return calculateSegmentGradient(point, nextPoint);
  });

  return points.map((point, index) => {
    const smoothedGradient = smoothGradient(rawGradients, index, smoothingRadius);

    return {
      ...point,
      gradient: Math.abs(smoothedGradient) <= 0.0001 ? 0 : smoothedGradient,
    };
  });
}
