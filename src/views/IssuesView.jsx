import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchIssues } from '../store/issuesSlice';
import { Search, Settings, AlertTriangle, CheckCircle, MapPin, Clock, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

const IssueRow = ({ issue }) => (
  <motion.tr 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="table-row"
  >
    <td>#{issue.id}</td>
    <td>
      <div className="location-cell">
        <MapPin size={14} />
        <span>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</span>
      </div>
    </td>
    <td><span className="badge-category">{issue.prediction}</span></td>
    <td>
      <div className="time-cell">
        <Clock size={14} />
        <span>{new Date(issue.created_at).toLocaleString()}</span>
      </div>
    </td>
    <td>
      <span className={`status-badge ${issue.status?.toLowerCase() || 'pending'}`}>
        {issue.status === 'Resolved' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
        {issue.status || 'Pending'}
      </span>
    </td>
    <td>
      <button className="btn-icon">
        <MoreVertical size={16} />
      </button>
    </td>
  </motion.tr>
);

const IssuesView = () => {
  const dispatch = useDispatch();
  const { items: issues, loading, error } = useSelector(state => state.issues);

  useEffect(() => {
    // Only fetch if not already loaded to save requests
    if (issues.length === 0) {
      dispatch(fetchIssues());
    }
  }, [dispatch, issues.length]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="issues-view">
      <div className="welcome-section">
        <h1 className="gradient-text">Issue Management</h1>
        <p>View, filter, and manage all reported infrastructure issues.</p>
      </div>
      <section className="card table-section">
        <div className="section-header">
          <h3>All Reports</h3>
          <div className="header-actions">
            <button className="btn-icon"><Search size={16} /></button>
            <button className="btn-icon"><Settings size={16} /></button>
          </div>
        </div>
        <div className="table-container">
          {loading ? (
            <p>Loading issues...</p>
          ) : error ? (
            <p style={{color: 'red'}}>Error: {error}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Time Reported</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
                {issues.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center'}}>No issues found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default IssuesView;
