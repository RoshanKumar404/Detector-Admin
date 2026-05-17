import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchIssues } from '../store/issuesSlice';
import { AlertTriangle, CheckCircle, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import HeatmapComponent from '../components/HeatmapComponent';

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card stat-card"
  >
    <div className="stat-header">
      <div className="stat-icon" style={{ backgroundColor: `${color}20`, color: color }}>
        <Icon size={24} />
      </div>
      <span className={`stat-change ${change.startsWith('+') ? 'positive' : 'negative'}`}>
        {change}
      </span>
    </div>
    <div className="stat-body">
      <h3>{value}</h3>
      <p>{title}</p>
    </div>
  </motion.div>
);

const DashboardView = () => {
  const dispatch = useDispatch();
  const { items: issues, loading, error } = useSelector(state => state.issues);

  useEffect(() => {
    dispatch(fetchIssues());
  }, [dispatch]);

  const totalIssues = issues.length;
  const resolvedIssues = issues.filter(i => i.status === 'Resolved').length;
  
  return (
    <>
      <div className="welcome-section">
        <h1 className="gradient-text">Dashboard Overview</h1>
        <p>Welcome back, Admin. Here's what's happening with the infrastructure.</p>
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Total Reports" 
          value={loading ? '...' : totalIssues} 
          change="+12%" 
          icon={AlertTriangle} 
          color="#ff5252" 
        />
        <StatCard 
          title="Resolved" 
          value={loading ? '...' : resolvedIssues} 
          change="+5%" 
          icon={CheckCircle} 
          color="#00e676" 
        />
        <StatCard 
          title="Active Users" 
          value="856" 
          change="+18%" 
          icon={Users} 
          color="#00e5ff" 
        />
        <StatCard 
          title="Avg Response" 
          value="1.2h" 
          change="-15%" 
          icon={Clock} 
          color="#7c4dff" 
        />
      </div>

      <div className="dashboard-grid">
        <section className="card active-map-section" style={{ gridColumn: '1 / -1', height: '500px', display: 'flex', flexDirection: 'column' }}>
          <div className="section-header">
            <h3>Live Issue Heatmap</h3>
            <div className="status-indicator">
              <span className="pulse"></span>
              Live
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
            {error ? (
              <p style={{color: 'red'}}>Error loading map data: {error}</p>
            ) : (
              <HeatmapComponent issues={issues} />
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default DashboardView;
