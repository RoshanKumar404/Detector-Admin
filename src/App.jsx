import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Droplets,
  Eye,
  LogOut,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api, authStore } from './services/api.js';
import HeatmapPanel from './components/HeatmapPanel.jsx';

const statusLabels = ['all', 'pending', 'verified', 'resolved', 'rejected'];

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [municipalityLoading, setMunicipalityLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api.getMunicipalities()
      .then(data => {
        if (!active) return;
        setMunicipalities(data);
        if (!selectedMunicipalityId && data.length) {
          setSelectedMunicipalityId(String(data[0].municipality_id));
        }
      })
      .catch(err => {
        if (active) setError(err.message || 'Failed to load municipalities');
      })
      .finally(() => {
        if (active) setMunicipalityLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!selectedMunicipalityId) {
        throw new Error('Please select a municipality');
      }

      if (mode === 'register') {
        await api.registerAdmin({ 
          name, 
          email, 
          password,
          contact_number: contactNumber,
          municipality_id: Number(selectedMunicipalityId)
        });
        setMode('login');
        setError('Admin created. You can log in now.');
      } else {
        const session = await api.loginAdmin({
          email,
          password,
          municipality_id: Number(selectedMunicipalityId),
        });
        onLogin(session);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">
          <Droplets size={30} />
        </div>
        <h1>Detector Admin</h1>
        <p>Municipal dashboard for reviewing and resolving waterlogging reports.</p>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <>
              <label>
                Name
                <input value={name} onChange={event => setName(event.target.value)} required />
              </label>
              <label>
                Contact Number
                <input value={contactNumber} onChange={event => setContactNumber(event.target.value)} required />
              </label>
            </>
          )}
          <label>
            Municipality
            <select
              value={selectedMunicipalityId}
              onChange={event => setSelectedMunicipalityId(event.target.value)}
              disabled={municipalityLoading}
              required
            >
              <option value="">
                {municipalityLoading ? 'Loading municipalities...' : 'Select municipality'}
              </option>
              {municipalities.map(municipality => (
                <option key={municipality.municipality_id} value={municipality.municipality_id}>
                  {municipality.municipality_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <div className={error.includes('created') ? 'notice' : 'error'}>{error}</div>}

          <button className="primary-button" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Admin'}
          </button>
        </form>

        <button className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create an admin account' : 'Back to login'}
        </button>
      </section>
    </main>
  );
}

function StatCard({ title, value, icon: Icon, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{title}</span>
      </div>
    </article>
  );
}

function IssueTable({ issues, onResolve }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Reports</h2>
          <p>Incoming citizen reports from the Detector mobile app.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Location</th>
              <th>Prediction</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(issue => (
              <tr key={issue.id}>
                <td>#{issue.id}</td>
                <td>
                  <span className="location-cell">
                    <MapPin size={14} />
                    {Number(issue.latitude).toFixed(4)}, {Number(issue.longitude).toFixed(4)}
                  </span>
                </td>
                <td>{issue.prediction || 'unknown'}</td>
                <td>{Math.round((Number(issue.confidence) || 0) * 100)}%</td>
                <td>
                  <span className={`status ${issue.status || 'pending'}`}>{issue.status || 'pending'}</span>
                </td>
                <td>{issue.created_at ? new Date(issue.created_at).toLocaleString() : '-'}</td>
                <td>
                  <button
                    className="small-button"
                    disabled={issue.status === 'resolved'}
                    onClick={() => onResolve(issue)}
                  >
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
            {!issues.length && (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Dashboard({ session, onLogout }) {
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadIssues = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getIssues(statusFilter === 'all' ? undefined : statusFilter);
      setIssues(data);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
      if (err.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [statusFilter]);

  const stats = useMemo(() => {
    const resolved = issues.filter(issue => issue.status === 'resolved').length;
    const pending = issues.filter(issue => issue.status === 'pending').length;
    const verified = issues.filter(issue => issue.status === 'verified').length;

    return { total: issues.length, resolved, pending, verified };
  }, [issues]);

  const handleResolve = async issue => {
    const remarks = window.prompt(`Resolution remarks for report #${issue.id}`, 'Resolved by municipal team');
    if (remarks === null) return;

    try {
      await api.resolveIssue({ issue_id: issue.id, remarks });
      await loadIssues();
    } catch (err) {
      setError(err.message || 'Failed to resolve issue');
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-row">
          <div className="logo-box">
            <Droplets size={24} />
          </div>
          <div>
            <h1>Detector</h1>
            <span>Admin Console</span>
          </div>
        </div>

        <nav>
          <a className="active">
            <BarChart3 size={18} />
            Dashboard
          </a>
          <a>
            <Eye size={18} />
            Reports
          </a>
        </nav>

        <div className="admin-card">
          <ShieldCheck size={18} style={{ alignSelf: 'flex-start', marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>{session.admin?.name || 'Admin'}</strong>
            <span>{session.admin?.email}</span>
            {session.admin?.municipality_name && (
              <span className="municipality-chip">
                {session.admin.municipality_name}
              </span>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>Waterlogging Operations</h2>
            <p>Review, map, and resolve citizen reports.</p>
          </div>
          <button className="ghost-button" onClick={onLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <section className="stats-grid">
          <StatCard title="Total Reports" value={stats.total} icon={AlertTriangle} tone="danger" />
          <StatCard title="Pending" value={stats.pending} icon={Clock3} tone="warning" />
          <StatCard title="Verified" value={stats.verified} icon={Users} tone="info" />
          <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} tone="success" />
        </section>

        <section className="toolbar">
          <div className="status-tabs">
            {statusLabels.map(status => (
              <button
                key={status}
                className={statusFilter === status ? 'selected' : ''}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
          <button className="ghost-button" onClick={loadIssues} disabled={loading}>
            <RefreshCcw size={16} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </section>

        {error && <div className="error">{error}</div>}

        <section className="map-grid">
          <HeatmapPanel issues={issues} />
          <div className="panel insight-panel">
            <h2>Backend Contract</h2>
            <p>
              This dashboard uses admin JWT auth and expects your Flask API at{' '}
              <code>{api.baseUrl}</code>.
            </p>
            <ul>
              <li>POST /auth/admin/login with municipality_id</li>
              <li>GET /issues/ filtered by admin municipality</li>
              <li>POST /resolutions/</li>
            </ul>
          </div>
        </section>

        <IssueTable issues={issues} onResolve={handleResolve} />
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => authStore.get());

  const handleLogout = () => {
    authStore.clear();
    setSession(null);
  };

  if (!session?.token) {
    return <LoginView onLogin={nextSession => setSession(nextSession)} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}
