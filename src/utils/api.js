// API utility functions
const API_BASE_URL = '[AWS API Gateway URL]'; // Replace with your actual AWS API Gateway URL
const API_KEY = '[ AWS API Key ]'; // Replace with your actual AWS API Key

export const fetchWaterQualityData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/data`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching water quality data:', error);
    throw error;
  }
};

export const processWaterQualityData = (rawData) => {
  return rawData.map(item => ({
    deviceId: item.device_id,
    dormName: item.dorm_name,
    timestamp: item.timestamp,
    qualityStatus: item.quality_status,
    alerts: item.alerts || [],
    waterQuality: {
      temperature: item.water_quality.temperature_celsius,
      turbidity: item.water_quality.turbidity_ntu,
      dissolvedOxygen: item.water_quality.dissolved_oxygen_mg_l,
      ph: item.water_quality.ph,
      tds: item.water_quality.tds_ppm,
      conductivity: item.water_quality.conductivity_us_cm,
      orp: item.water_quality.orp_mv
    }
  }));
};

export const getLatestDataByDorm = (data) => {
  const dormMap = new Map();
  
  data.forEach(item => {
    const existing = dormMap.get(item.dormName);
    if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
      dormMap.set(item.dormName, item);
    }
  });
  
  return Array.from(dormMap.values());
};

export const getQualityStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'EXCELLENT':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'GOOD':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'WARNING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getSeverityColor = (severity) => {
  switch (severity?.toUpperCase()) {
    case 'HIGH':
      return 'text-red-600';
    case 'MEDIUM':
      return 'text-yellow-600';
    case 'LOW':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};
