import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  MapPin,
  Clock,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  ScatterChart,
  Scatter
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Card, Badge, LoadingSkeleton, Button } from '../components/ui';
import { fetchWaterQualityData, processWaterQualityData } from '../utils/api';
import { formatTimestamp } from '../utils/helpers';

const MetricCard = ({ title, current, previous, unit, icon: Icon }) => {
  const change = current - previous;
  const percentChange = previous !== 0 ? ((change / previous) * 100) : 0;
  const isPositive = change >= 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-end space-x-2">
          <span className="text-2xl font-bold text-gray-900">{current.toFixed(1)}</span>
          <span className="text-sm text-gray-500 mb-1">{unit}</span>
        </div>
        
        <div className="flex items-center">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(percentChange).toFixed(1)}% vs last period
          </span>
        </div>
      </div>
    </Card>
  );
};

const ChartContainer = ({ title, children, actions }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
    <div className="h-80">
      {children}
    </div>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm text-gray-600 mb-2">{format(new Date(label), 'MMM dd, yyyy HH:mm')}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(2)} {entry.payload.unit || ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const HistoricalData = () => {
  const [waterData, setWaterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDorm, setSelectedDorm] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [chartType, setChartType] = useState('line');
  const [selectedParameters, setSelectedParameters] = useState(['ph', 'temperature']);

  useEffect(() => {
    loadData();
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

  const getFilteredData = () => {
    let filtered = waterData;

    // Filter by dorm
    if (selectedDorm !== 'all') {
      filtered = filtered.filter(item => item.dormName === selectedDorm);
    }

    // Filter by date range
    const now = new Date();
    let startDate;
    switch (dateRange) {
      case '24h':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subDays(now, 7);
    }

    filtered = filtered.filter(item => new Date(item.timestamp) >= startDate);

    // Sort by timestamp
    return filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const prepareChartData = () => {
    const filtered = getFilteredData();
    
    return filtered.map(item => ({
      timestamp: item.timestamp,
      ph: item.waterQuality.ph,
      temperature: item.waterQuality.temperature,
      turbidity: item.waterQuality.turbidity,
      dissolvedOxygen: item.waterQuality.dissolvedOxygen,
      tds: item.waterQuality.tds,
      conductivity: item.waterQuality.conductivity,
      orp: item.waterQuality.orp,
      dormName: item.dormName,
      qualityStatus: item.qualityStatus
    }));
  };

  const getMetrics = () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) return null;

    const current = filtered.slice(-Math.max(1, Math.floor(filtered.length / 2)));
    const previous = filtered.slice(0, Math.floor(filtered.length / 2));

    const currentAvg = {
      ph: current.reduce((acc, curr) => acc + curr.waterQuality.ph, 0) / current.length,
      temperature: current.reduce((acc, curr) => acc + curr.waterQuality.temperature, 0) / current.length,
      turbidity: current.reduce((acc, curr) => acc + curr.waterQuality.turbidity, 0) / current.length,
      dissolvedOxygen: current.reduce((acc, curr) => acc + curr.waterQuality.dissolvedOxygen, 0) / current.length,
    };

    const previousAvg = {
      ph: previous.length > 0 ? previous.reduce((acc, curr) => acc + curr.waterQuality.ph, 0) / previous.length : 0,
      temperature: previous.length > 0 ? previous.reduce((acc, curr) => acc + curr.waterQuality.temperature, 0) / previous.length : 0,
      turbidity: previous.length > 0 ? previous.reduce((acc, curr) => acc + curr.waterQuality.turbidity, 0) / previous.length : 0,
      dissolvedOxygen: previous.length > 0 ? previous.reduce((acc, curr) => acc + curr.waterQuality.dissolvedOxygen, 0) / previous.length : 0,
    };

    return { current: currentAvg, previous: previousAvg };
  };

  const getDormOptions = () => {
    const dorms = [...new Set(waterData.map(item => item.dormName))];
    return dorms.sort();
  };

  const chartData = prepareChartData();
  const metrics = getMetrics();
  const dormOptions = getDormOptions();

  const getParameterColor = (param) => {
    const colors = {
      ph: '#3B82F6',
      temperature: '#EF4444',
      turbidity: '#10B981',
      dissolvedOxygen: '#8B5CF6',
      tds: '#F59E0B',
      conductivity: '#06B6D4',
      orp: '#EC4899'
    };
    return colors[param] || '#6B7280';
  };

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => format(new Date(value), 'MM/dd HH:mm')}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            {selectedParameters.map(param => (
              <Area
                key={param}
                type="monotone"
                dataKey={param}
                stroke={getParameterColor(param)}
                fill={getParameterColor(param)}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => format(new Date(value), 'MM/dd')}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            {selectedParameters.map(param => (
              <Bar
                key={param}
                dataKey={param}
                fill={getParameterColor(param)}
                opacity={0.8}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Default line chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => format(new Date(value), 'MM/dd HH:mm')}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          {selectedParameters.map(param => (
            <Line
              key={param}
              type="monotone"
              dataKey={param}
              stroke={getParameterColor(param)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: getParameterColor(param), strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <LoadingSkeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-32" />
            ))}
          </div>
          <LoadingSkeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historical Data Analysis</h1>
            <p className="text-gray-600 mt-1">Trends and patterns in water quality over time</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-4 lg:mt-0">
            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {/* Dorm Filter */}
            <select
              value={selectedDorm}
              onChange={(e) => setSelectedDorm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {dormOptions.map(dorm => (
                <option key={dorm} value={dorm}>{dorm}</option>
              ))}
            </select>

            {/* Chart Type */}
            <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded ${chartType === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <LineChartIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`p-2 rounded ${chartType === 'area' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Activity className="h-4 w-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded ${chartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>

            <Button variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        {metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <MetricCard
              title="Average pH"
              current={metrics.current.ph}
              previous={metrics.previous.ph}
              unit=""
              icon={Activity}
            />
            <MetricCard
              title="Average Temperature"
              current={metrics.current.temperature}
              previous={metrics.previous.temperature}
              unit="°C"
              icon={Activity}
            />
            <MetricCard
              title="Average Turbidity"
              current={metrics.current.turbidity}
              previous={metrics.previous.turbidity}
              unit="NTU"
              icon={Activity}
            />
            <MetricCard
              title="Dissolved Oxygen"
              current={metrics.current.dissolvedOxygen}
              previous={metrics.previous.dissolvedOxygen}
              unit="mg/L"
              icon={Activity}
            />
          </motion.div>
        )}

        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ChartContainer
            title="Water Quality Parameters Over Time"
            actions={
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Parameters:</span>
                <select
                  multiple
                  value={selectedParameters}
                  onChange={(e) => setSelectedParameters(Array.from(e.target.selectedOptions, option => option.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ph">pH Level</option>
                  <option value="temperature">Temperature</option>
                  <option value="turbidity">Turbidity</option>
                  <option value="dissolvedOxygen">Dissolved Oxygen</option>
                  <option value="tds">TDS</option>
                  <option value="conductivity">Conductivity</option>
                  <option value="orp">ORP</option>
                </select>
              </div>
            }
          >
            {chartData.length > 0 ? renderChart() : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No data available for the selected filters</p>
                  <p className="text-sm">Try adjusting your date range or location filter</p>
                </div>
              </div>
            )}
          </ChartContainer>
        </motion.div>

        {/* Additional Charts Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"
        >
          {/* pH Distribution */}
          <ChartContainer title="pH Level Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.reduce((acc, curr) => {
                const phRange = Math.floor(curr.ph * 2) / 2; // Round to nearest 0.5
                const existing = acc.find(item => item.range === phRange);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ range: phRange, count: 1 });
                }
                return acc;
              }, []).sort((a, b) => a.range - b.range)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Quality Status Timeline */}
          <ChartContainer title="Quality Status Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.map(item => ({
                ...item,
                excellent: item.qualityStatus === 'EXCELLENT' ? 1 : 0,
                good: item.qualityStatus === 'GOOD' ? 1 : 0,
                warning: item.qualityStatus === 'WARNING' ? 1 : 0,
                critical: item.qualityStatus === 'CRITICAL' ? 1 : 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="excellent" stackId="1" stroke="#10B981" fill="#10B981" />
                <Area type="monotone" dataKey="good" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
                <Area type="monotone" dataKey="warning" stackId="1" stroke="#F59E0B" fill="#F59E0B" />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#EF4444" fill="#EF4444" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>

        {/* Data Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Total Data Points</p>
                <p className="text-2xl font-bold text-blue-600">{chartData.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date Range</p>
                <p className="text-lg font-medium">
                  {chartData.length > 0 && (
                    `${format(new Date(chartData[0].timestamp), 'MMM dd')} - ${format(new Date(chartData[chartData.length - 1].timestamp), 'MMM dd')}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Locations Monitored</p>
                <p className="text-2xl font-bold text-green-600">{dormOptions.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default HistoricalData;