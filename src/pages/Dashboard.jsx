import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Settings,
  Filter,
  RefreshCw,
  Download,
  Eye,
  MapPin,
  Clock,
  Waves
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Card, Badge, LoadingSkeleton, Button } from '../components/ui';
import { fetchWaterQualityData, processWaterQualityData, getLatestDataByDorm } from '../utils/api';
import { formatTimestamp, getParameterStatus, calculateOverallScore } from '../utils/helpers';

const ParameterCard = ({ title, value, unit, status, icon: Icon, trend, target }) => (
  <Card className="p-6 relative overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-lg ${status === 'good' ? 'bg-green-100' : 'bg-red-100'}`}>
          <Icon className={`h-6 w-6 ${status === 'good' ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">Target: {target}</p>
        </div>
      </div>
      <Badge variant={status === 'good' ? 'good' : 'critical'}>
        {status === 'good' ? 'Normal' : 'Alert'}
      </Badge>
    </div>
    
    <div className="space-y-2">
      <div className="flex items-end space-x-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="text-lg text-gray-500 mb-1">{unit}</span>
      </div>
      
      {trend && (
        <div className="flex items-center">
          {trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(trend)}% from last hour
          </span>
        </div>
      )}
    </div>
  </Card>
);

const AlertCard = ({ alert, dormName }) => (
  <Card className="p-4 border-l-4 border-red-500">
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-gray-900">{dormName}</h4>
            <Badge variant={alert.severity?.toLowerCase()}>
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{alert.message}</p>
          <p className="text-xs text-gray-500 mt-1">Alert Type: {alert.type}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm">
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  </Card>
);

const LocationCard = ({ data, onClick }) => {
  const score = calculateOverallScore(data.waterQuality);
  const hasAlerts = data.alerts && data.alerts.length > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="p-6 relative">
        {hasAlerts && (
          <div className="absolute top-4 right-4">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">{data.dormName}</h3>
              <p className="text-sm text-gray-500">{data.deviceId}</p>
            </div>
          </div>
          <Badge variant={data.qualityStatus.toLowerCase()}>
            {data.qualityStatus}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Health Score</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{score}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-500">pH</p>
              <p className="font-medium">{data.waterQuality.ph}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-500">Temp</p>
              <p className="font-medium">{data.waterQuality.temperature}°C</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-gray-500">DO</p>
              <p className="font-medium">{data.waterQuality.dissolvedOxygen}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimestamp(data.timestamp)}
            </div>
            {hasAlerts && (
              <Badge variant="critical" className="text-xs">
                {data.alerts.length} Alert(s)
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const QuickStats = ({ data }) => {
  const stats = {
    total: data.length,
    healthy: data.filter(d => ['GOOD', 'EXCELLENT'].includes(d.qualityStatus)).length,
    warnings: data.filter(d => d.qualityStatus === 'WARNING').length,
    critical: data.filter(d => d.qualityStatus === 'CRITICAL').length,
    totalAlerts: data.reduce((acc, curr) => acc + (curr.alerts?.length || 0), 0)
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
      <Card className="p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg mr-4">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Locations</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg mr-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Healthy</p>
            <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 rounded-lg mr-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Warnings</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-lg mr-4">
            <Activity className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Critical</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg mr-4">
            <AlertTriangle className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Alerts</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalAlerts}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const [waterData, setWaterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const rawData = await fetchWaterQualityData();
      const processedData = processWaterQualityData(rawData);
      setWaterData(processedData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getLatestDataByDorm = () => {
    const dormMap = new Map();
    waterData.forEach(item => {
      const existing = dormMap.get(item.dormName);
      if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
        dormMap.set(item.dormName, item);
      }
    });
    return Array.from(dormMap.values());
  };

  const filteredData = () => {
    const latestData = getLatestDataByDorm();
    switch (filter) {
      case 'critical':
        return latestData.filter(d => d.qualityStatus === 'CRITICAL');
      case 'warning':
        return latestData.filter(d => d.qualityStatus === 'WARNING');
      case 'good':
        return latestData.filter(d => ['GOOD', 'EXCELLENT'].includes(d.qualityStatus));
      default:
        return latestData;
    }
  };

  const getAllAlerts = () => {
    return getLatestDataByDorm().flatMap(item => 
      item.alerts.map(alert => ({ ...alert, dormName: item.dormName }))
    );
  };

  const getParameterData = () => {
    const latest = getLatestDataByDorm();
    return {
      avgPH: latest.reduce((acc, curr) => acc + curr.waterQuality.ph, 0) / latest.length,
      avgTemp: latest.reduce((acc, curr) => acc + curr.waterQuality.temperature, 0) / latest.length,
      avgDO: latest.reduce((acc, curr) => acc + curr.waterQuality.dissolvedOxygen, 0) / latest.length,
      avgTurbidity: latest.reduce((acc, curr) => acc + curr.waterQuality.turbidity, 0) / latest.length,
    };
  };

  const parameterData = getParameterData();
  const allAlerts = getAllAlerts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <LoadingSkeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Water Quality Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time monitoring and analytics</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warnings Only</option>
              <option value="good">Healthy Only</option>
            </select>
            
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            
            <Button variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStats data={getLatestDataByDorm()} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Parameter Cards and Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parameter Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ParameterCard
                title="Average pH Level"
                value={parameterData.avgPH.toFixed(1)}
                unit=""
                status={getParameterStatus(parameterData.avgPH, 'ph').status}
                icon={Droplets}
                target="6.5 - 8.5"
                trend={2.3}
              />
              <ParameterCard
                title="Average Temperature"
                value={parameterData.avgTemp.toFixed(1)}
                unit="°C"
                status={getParameterStatus(parameterData.avgTemp, 'temperature').status}
                icon={Thermometer}
                target="20 - 30°C"
                trend={-1.2}
              />
              <ParameterCard
                title="Dissolved Oxygen"
                value={parameterData.avgDO.toFixed(1)}
                unit="mg/L"
                status={getParameterStatus(parameterData.avgDO, 'dissolvedOxygen').status}
                icon={Waves}
                target="> 6.0 mg/L"
                trend={0.8}
              />
              <ParameterCard
                title="Average Turbidity"
                value={parameterData.avgTurbidity.toFixed(1)}
                unit="NTU"
                status={getParameterStatus(parameterData.avgTurbidity, 'turbidity').status}
                icon={Activity}
                target="< 4.0 NTU"
                trend={-3.1}
              />
            </div>

            {/* Locations Grid */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Location Status</h2>
                <Badge variant="default">
                  {filteredData().length} Locations
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredData().map((location, index) => (
                  <motion.div
                    key={location.deviceId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <LocationCard
                      data={location}
                      onClick={() => setSelectedLocation(location)}
                    />
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Alerts and Recent Activity */}
          <div className="space-y-6">
            {/* Active Alerts */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Active Alerts</h2>
                <Badge variant="critical">
                  {allAlerts.length} Active
                </Badge>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allAlerts.length > 0 ? (
                  allAlerts.map((alert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <AlertCard alert={alert} dormName={alert.dormName} />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No active alerts</p>
                    <p className="text-sm">All systems are operating normally</p>
                  </div>
                )}
              </div>
            </Card>

            {/* System Status */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">System Status</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Data Collection</span>
                  <Badge variant="good">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Alert System</span>
                  <Badge variant="good">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Update</span>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(Math.max(...waterData.map(d => new Date(d.timestamp))))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Devices Online</span>
                  <span className="font-medium">{getLatestDataByDorm().length}/8</span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              
              <div className="space-y-3">
                <Button className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Alerts
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;