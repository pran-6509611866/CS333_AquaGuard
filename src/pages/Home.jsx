import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  TrendingUp, 
  Shield, 
  Bell, 
  AlertTriangle,
  CheckCircle,
  Activity,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, Badge, LoadingSkeleton } from '../components/ui';
import { fetchWaterQualityData, processWaterQualityData, getLatestDataByDorm, getQualityStatusColor } from '../utils/api';
import { formatTimestamp, calculateOverallScore } from '../utils/helpers';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold text-${color}-600 mt-2`}>{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 bg-${color}-100 rounded-lg`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center">
        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
        <span className="text-sm text-green-600">{trend}</span>
      </div>
    )}
  </Card>
);

const DormCard = ({ data }) => {
  const score = calculateOverallScore(data.waterQuality);
  const hasAlerts = data.alerts && data.alerts.length > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-6 relative overflow-hidden">
        {hasAlerts && (
          <div className="absolute top-0 right-0 p-2">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{data.dormName}</h3>
              <p className="text-sm text-gray-500">{data.deviceId}</p>
            </div>
          </div>
          <Badge variant={data.qualityStatus.toLowerCase()}>
            {data.qualityStatus}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Overall Score</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{score}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <p className="text-gray-500">pH</p>
              <p className="font-medium">{data.waterQuality.ph}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Temp</p>
              <p className="font-medium">{data.waterQuality.temperature}°C</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">DO</p>
              <p className="font-medium">{data.waterQuality.dissolvedOxygen}</p>
            </div>
          </div>

          {hasAlerts && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{data.alerts.length} Alert(s)</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimestamp(data.timestamp)}
            </div>
            <Link 
              to="/dashboard" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const AlertBanner = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(alert => alert.severity === 'HIGH');
  const warningAlerts = alerts.filter(alert => alert.severity === 'MEDIUM');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="p-4 border-l-4 border-red-500 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">
                {criticalAlerts.length > 0 ? 'Critical Alerts Detected' : 'Warnings Detected'}
              </h3>
              <p className="text-sm text-red-700">
                {criticalAlerts.length} critical, {warningAlerts.length} warnings
              </p>
            </div>
          </div>
          <Link 
            to="/dashboard" 
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            View All
          </Link>
        </div>
      </Card>
    </motion.div>
  );
};

const Home = () => {
  const [waterData, setWaterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const rawData = await fetchWaterQualityData();
        const processedData = processWaterQualityData(rawData);
        const latestData = getLatestDataByDorm(processedData);
        setWaterData(latestData);
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load water quality data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAllAlerts = () => {
    return waterData.flatMap(item => 
      item.alerts.map(alert => ({ ...alert, dormName: item.dormName }))
    );
  };

  const getStats = () => {
    if (waterData.length === 0) return { total: 0, good: 0, warning: 0, critical: 0 };
    
    return {
      total: waterData.length,
      good: waterData.filter(d => ['GOOD', 'EXCELLENT'].includes(d.qualityStatus)).length,
      warning: waterData.filter(d => d.qualityStatus === 'WARNING').length,
      critical: waterData.filter(d => d.qualityStatus === 'CRITICAL').length,
    };
  };

  const stats = getStats();
  const allAlerts = getAllAlerts();

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Real-time Water Quality
            <span className="block text-blue-600">Monitoring System</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Ensuring safe water quality across all dormitory facilities with IoT-powered monitoring and instant alerts.
          </p>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Activity className="h-5 w-5 mr-2" />
              View Dashboard
            </Link>
            <Link 
              to="/historical-data"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              View Trends
            </Link>
          </div>
        </motion.div>

        {/* Alert Banner */}
        <AlertBanner alerts={allAlerts} />

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          {loading ? (
            [...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                title="Total Locations"
                value={stats.total}
                subtitle="Monitoring points"
                icon={MapPin}
                color="blue"
              />
              <StatCard
                title="Healthy Status"
                value={stats.good}
                subtitle={`${stats.total > 0 ? Math.round((stats.good / stats.total) * 100) : 0}% of locations`}
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Warnings"
                value={stats.warning}
                subtitle="Need attention"
                icon={AlertTriangle}
                color="yellow"
              />
              <StatCard
                title="Critical Issues"
                value={stats.critical}
                subtitle="Immediate action required"
                icon={Shield}
                color="red"
              />
            </>
          )}
        </motion.div>

        {/* Dormitory Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Current Status</h2>
            {!loading && waterData.length > 0 && (
              <p className="text-sm text-gray-500">
                Last updated: {formatTimestamp(Math.max(...waterData.map(d => new Date(d.timestamp))))}
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <LoadingSkeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : waterData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {waterData.map((dorm, index) => (
                <motion.div
                  key={dorm.deviceId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <DormCard data={dorm} />
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Droplets className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">Water quality data will appear here once available.</p>
            </Card>
          )}
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Advanced Monitoring Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center">
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Monitoring</h3>
              <p className="text-gray-600">
                24/7 continuous monitoring of water quality parameters with instant data updates.
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Bell className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Alerts</h3>
              <p className="text-gray-600">
                Intelligent alert system that notifies you immediately when parameters exceed safe limits.
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Historical Analytics</h3>
              <p className="text-gray-600">
                Comprehensive data analysis and trends to help predict and prevent issues.
              </p>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;