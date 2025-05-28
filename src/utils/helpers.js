import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const getParameterStatus = (value, parameter) => {
  const thresholds = {
    ph: { min: 6.5, max: 8.5, unit: '', name: 'pH' },
    temperature: { min: 20, max: 30, unit: '°C', name: 'Temperature' },
    turbidity: { min: 0, max: 4, unit: ' NTU', name: 'Turbidity' },
    dissolvedOxygen: { min: 6, max: 15, unit: ' mg/L', name: 'Dissolved Oxygen' },
    tds: { min: 0, max: 500, unit: ' ppm', name: 'TDS' },
    conductivity: { min: 0, max: 800, unit: ' µS/cm', name: 'Conductivity' },
    orp: { min: 200, max: 800, unit: ' mV', name: 'ORP' }
  };

  const threshold = thresholds[parameter];
  if (!threshold) return { status: 'unknown', color: 'text-gray-500' };

  if (value >= threshold.min && value <= threshold.max) {
    return { status: 'good', color: 'text-green-600' };
  } else {
    return { status: 'bad', color: 'text-red-600' };
  }
};

export const calculateOverallScore = (waterQuality) => {
  const parameters = ['ph', 'temperature', 'turbidity', 'dissolvedOxygen', 'tds', 'conductivity', 'orp'];
  let goodCount = 0;
  
  parameters.forEach(param => {
    const status = getParameterStatus(waterQuality[param], param);
    if (status.status === 'good') goodCount++;
  });
  
  return Math.round((goodCount / parameters.length) * 100);
};
