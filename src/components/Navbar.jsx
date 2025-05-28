import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  BarChart3, 
  History, 
  Settings, 
  Bell, 
  Menu, 
  X,
  Home
} from 'lucide-react';
import { cn } from '../utils/helpers';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Historical Data', href: '/historical-data', icon: History },
];

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 1C16 1 7 10 7 18C7 23.5228 11.4772 28 17 28H15C20.5228 28 25 23.5228 25 18C25 10 16 1 16 1Z" fill="url(#gradient1)"/>
                <path d="M16 4C16 4 10 11 10 17C10 21.4183 13.5817 25 18 25H14C18.4183 25 22 21.4183 22 17C22 11 16 4 16 4Z" fill="url(#gradient2)" opacity="0.8"/>
                <circle cx="16" cy="16" r="3" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.7"/>
                <circle cx="16" cy="16" r="5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.5"/>
                <circle cx="16" cy="16" r="1.5" fill="#ffffff" opacity="0.9"/>
                <rect x="12.5" y="19" width="1" height="4" fill="#4ade80" rx="0.5"/>
                <rect x="14" y="17.5" width="1" height="5.5" fill="#22c55e" rx="0.5"/>
                <rect x="15.5" y="16.5" width="1" height="6.5" fill="#16a34a" rx="0.5"/>
                <rect x="17" y="17.5" width="1" height="5.5" fill="#22c55e" rx="0.5"/>
                <rect x="18.5" y="19" width="1" height="4" fill="#4ade80" rx="0.5"/>
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                    <stop offset="50%" style={{stopColor:'#1d4ed8', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#1e40af', stopOpacity:1}} />
                  </linearGradient>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#60a5fa', stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:'#3b82f6', stopOpacity:1}} />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              AquaGuard
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative',
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-50 rounded-lg -z-10"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100"
          >
            <div className="py-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Bell className="h-4 w-4 mr-3" />
                  Notifications
                </button>
                <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
