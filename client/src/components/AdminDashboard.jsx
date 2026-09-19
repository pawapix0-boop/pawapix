import { useEffect, useState } from 'react';

const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'gigs', label: 'Gigs' },
  { id: 'creatives', label: 'Creatives' },
  { id: 'applications', label: 'Applications' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'plans', label: 'Plans' },
  { id: 'payment', label: 'Payment' }
];

function AdminDashboard({ onClose, initialToken, onLoginSuccess, onLogout }) {
  const [adminToken, setAdminToken] = useState(initialToken || '');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [adminData, setAdminData] = useState({
    stats: null,
    gigs: [],
    creatives: [],
    applications: [],
    contacts: [],
    plans: [],
    paymentConfig: null
  });
  const [planForm, setPlanForm] = useState({ name: '', price: 0, interval: 'month', currency: 'NGN', features: '', paymentGateway: 'stripe' });
  const [paymentForm, setPaymentForm] = useState({ gateway: 'stripe', enabled: true, publicKey: '', webhookSecret: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [gigForm, setGigForm] = useState({ title: '', creative: '', price: 0, delivery: '7 days', description: '', tags: '' });

  useEffect(() => {
    const savedToken = window.localStorage.getItem('pawapixAdminToken');
    if (savedToken) {
      setAdminToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!adminToken) return;

    const verifyAdmin = async () => {
      setIsLoading(true);
      try {
        await handleApi('/api/admin/me');
        await fetchAdminData();
      } catch (error) {
        setStatus({ type: 'error', message: 'Session invalid or expired. Please log in again.' });
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdmin();
  }, [adminToken]);

  const handleApi = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': options.body ? 'application/json' : 'application/json',
        ...(adminToken ? { 'x-admin-token': adminToken } : {}),
        ...options.headers
      }
    });

    const responseText = await response.text();
    let payload = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      payload = { error: 'The server returned an invalid response.' };
    }

    if (!response.ok) {
      throw new Error(payload.error || `Request failed: ${response.status}`);
    }

    return payload;
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [stats, gigs, creatives, applications, contacts, plans, paymentConfig] = await Promise.all([
        handleApi('/api/admin/dashboard'),
        handleApi('/api/admin/gigs'),
        handleApi('/api/admin/creatives'),
        handleApi('/api/admin/applications'),
        handleApi('/api/admin/contacts'),
        handleApi('/api/admin/plans'),
        handleApi('/api/admin/payment')
      ]);

      setAdminData({
        stats: stats.stats || stats,
        gigs,
        creatives,
        applications,
        contacts,
        plans,
        paymentConfig
      });
      setPaymentForm({
        gateway: paymentConfig.gateway,
        enabled: paymentConfig.enabled,
        publicKey: paymentConfig.publicKey,
        webhookSecret: paymentConfig.webhookSecret
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus({ type: 'idle', message: '' });
    setIsLoading(true);

    try {
      const payload = await handleApi('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });

      setAdminToken(payload.token);
      window.localStorage.setItem('pawapixAdminToken', payload.token);
      setStatus({ type: 'success', message: 'Admin login successful' });
      setActiveSection('dashboard');
      if (onLoginSuccess) onLoginSuccess(payload.token);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    window.localStorage.removeItem('pawapixAdminToken');
    setAdminData({ stats: null, gigs: [], creatives: [], applications: [], contacts: [], plans: [], paymentConfig: null });
    setStatus({ type: 'success', message: 'Logged out successfully' });
    if (onLogout) onLogout();
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const payload = {
        ...planForm,
        price: Number(planForm.price),
        features: planForm.features.split(',').map((item) => item.trim()).filter(Boolean)
      };
      const plan = await handleApi('/api/admin/plans', { method: 'POST', body: JSON.stringify(payload) });
      setAdminData((prev) => ({ ...prev, plans: [plan, ...prev.plans] }));
      setStatus({ type: 'success', message: 'Plan created successfully' });
      setPlanForm({ name: '', price: 0, interval: 'month', currency: 'NGN', features: '', paymentGateway: 'stripe' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePayment = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const config = await handleApi('/api/admin/payment', {
        method: 'PUT',
        body: JSON.stringify(paymentForm)
      });
      setAdminData((prev) => ({ ...prev, paymentConfig: config }));
      setStatus({ type: 'success', message: 'Payment gateway updated' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Delete this plan?')) return;
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      await handleApi(`/api/admin/plans/${planId}`, { method: 'DELETE' });
      setAdminData((prev) => ({ ...prev, plans: prev.plans.filter((plan) => plan.id !== planId) }));
      setStatus({ type: 'success', message: 'Plan deleted' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = () => {
    if (!adminToken) {
      return (
        <div className="admin-login-panel">
          <h2>Admin Login</h2>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <label>
              Email
              <input type="email" value={loginForm.email} onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))} required />
            </label>
            <label>
              Password
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))} required />
            </label>
            <button type="submit" className="admin-submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="admin-grid admin-dashboard-grid">
            <div className="admin-card admin-stat-card">
              <h3>Live Stats</h3>
              <div className="admin-metrics">
                <div>
                  <strong>{adminData.stats?.gigs ?? 0}</strong>
                  <span>Gigs</span>
                </div>
                <div>
                  <strong>{adminData.stats?.creatives ?? 0}</strong>
                  <span>Creatives</span>
                </div>
                <div>
                  <strong>{adminData.stats?.applications ?? 0}</strong>
                  <span>Applications</span>
                </div>
                <div>
                  <strong>{adminData.stats?.contacts ?? 0}</strong>
                  <span>Contacts</span>
                </div>
                <div>
                  <strong>{adminData.stats?.plans ?? 0}</strong>
                  <span>Plans</span>
                </div>
              </div>
            </div>
            <div className="admin-card admin-payment-card">
              <h3>Payment Configuration</h3>
              <p><strong>Gateway:</strong> {adminData.paymentConfig?.gateway}</p>
              <p><strong>Status:</strong> {adminData.paymentConfig?.enabled ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Public Key:</strong> {adminData.paymentConfig?.publicKey}</p>
            </div>
            <div className="admin-card admin-current-plans">
              <h3>Available Plans</h3>
              <div className="admin-plan-list">
                {adminData.plans.map((plan) => (
                  <div key={plan.id} className="admin-plan-item">
                    <h4>{plan.name}</h4>
                    <small>{plan.currency} {plan.price}/{plan.interval}</small>
                    <p>{plan.features.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'gigs':
        return (
          <div className="admin-table-panel">
            <h2>Manage Gigs</h2>
            <div className="admin-actions-row">
              <button type="button" onClick={() => setActiveSection('gigs')} className="admin-action-button">Refresh</button>
            </div>
            <div className="admin-list-grid">
              {adminData.gigs.map((gig) => (
                <article key={gig.id} className="admin-item-card">
                  <div>
                    <h4>{gig.title}</h4>
                    <span>{gig.creative}</span>
                  </div>
                  <div>
                    <p>{gig.description}</p>
                    <small>{gig.delivery}, NGN {Number(gig.price || 0).toLocaleString()}</small>
                  </div>
                </article>
              ))}
            </div>
            <form className="admin-form-panel" onSubmit={async (event) => {
              event.preventDefault();
              setStatus({ type: 'idle', message: '' });
              setIsLoading(true);
              try {
                const payload = {
                  ...gigForm,
                  price: Number(gigForm.price),
                  tags: gigForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                };
                const newGig = await handleApi('/api/admin/gigs', { method: 'POST', body: JSON.stringify(payload) });
                setAdminData((prev) => ({ ...prev, gigs: [newGig, ...prev.gigs] }));
                setStatus({ type: 'success', message: 'Gig created successfully' });
                setGigForm({ title: '', creative: '', price: 0, delivery: '7 days', description: '', tags: '' });
              } catch (error) {
                setStatus({ type: 'error', message: error.message });
              } finally {
                setIsLoading(false);
              }
            }}>
              <h3>Create New Gig</h3>
              <label>
                Title
                <input value={gigForm.title} onChange={(event) => setGigForm((prev) => ({ ...prev, title: event.target.value }))} required />
              </label>
              <label>
                Creative
                <input value={gigForm.creative} onChange={(event) => setGigForm((prev) => ({ ...prev, creative: event.target.value }))} required />
              </label>
              <label>
                Price
                <input type="number" value={gigForm.price} onChange={(event) => setGigForm((prev) => ({ ...prev, price: event.target.value }))} required />
              </label>
              <label>
                Delivery
                <input value={gigForm.delivery} onChange={(event) => setGigForm((prev) => ({ ...prev, delivery: event.target.value }))} required />
              </label>
              <label>
                Tags (comma separated)
                <input value={gigForm.tags} onChange={(event) => setGigForm((prev) => ({ ...prev, tags: event.target.value }))} />
              </label>
              <label>
                Description
                <textarea rows="4" value={gigForm.description} onChange={(event) => setGigForm((prev) => ({ ...prev, description: event.target.value }))} required />
              </label>
              <button type="submit" className="admin-submit" disabled={isLoading}>{isLoading ? 'Creating…' : 'Create Gig'}</button>
            </form>
            {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
          </div>
        );
      case 'creatives':
        return (
          <div className="admin-table-panel">
            <h2>Manage Creatives</h2>
            <div className="admin-list-grid">
              {adminData.creatives.map((creative) => (
                <article key={creative.id} className="admin-item-card">
                  <div>
                    <h4>{creative.name}</h4>
                    <span>{creative.specialty}</span>
                  </div>
                  <div>
                    <p>{creative.location}</p>
                    <small>NGN {Number(creative.hourlyRate || 0).toLocaleString()}/hr • {creative.rating}★</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      case 'applications':
        return (
          <div className="admin-table-panel">
            <h2>Applications</h2>
            <div className="admin-list-grid admin-table-list">
              {adminData.applications.map((application) => (
                <article key={application.id} className="admin-item-card">
                  <div>
                    <h4>{application.name}</h4>
                    <span>{application.email}</span>
                  </div>
                  <div>
                    <p>{application.message}</p>
                    <small>{application.projectType} • {new Date(application.submittedAt).toLocaleString()}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      case 'contacts':
        return (
          <div className="admin-table-panel">
            <h2>Contact Messages</h2>
            <div className="admin-list-grid admin-table-list">
              {adminData.contacts.map((contact) => (
                <article key={contact.id} className="admin-item-card">
                  <div>
                    <h4>{contact.name}</h4>
                    <span>{contact.email}</span>
                  </div>
                  <div>
                    <p>{contact.message}</p>
                    <small>{contact.type || 'contact'} • {new Date(contact.createdAt).toLocaleString()}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      case 'plans':
        return (
          <div className="admin-table-panel">
            <h2>Pricing Plans</h2>
            <div className="admin-plan-grid">
              {adminData.plans.map((plan) => (
                <article key={plan.id} className="admin-plan-card">
                  <h4>{plan.name}</h4>
                  <p>{plan.currency} {plan.price}/{plan.interval}</p>
                  <p>{plan.features.join(', ')}</p>
                  <small>Gateway: {plan.paymentGateway}</small>
                  <div className="admin-card-actions">
                    <button type="button" onClick={() => setSelectedPlan(plan)}>Edit</button>
                    <button type="button" className="danger" onClick={() => handleDeletePlan(plan.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
            <form className="admin-form-panel" onSubmit={handleCreatePlan}>
              <h3>{selectedPlan ? 'Update Plan' : 'Create Plan'}</h3>
              <label>
                Name
                <input value={planForm.name} onChange={(event) => setPlanForm((prev) => ({ ...prev, name: event.target.value }))} required />
              </label>
              <label>
                Price
                <input type="number" value={planForm.price} onChange={(event) => setPlanForm((prev) => ({ ...prev, price: event.target.value }))} required />
              </label>
              <label>
                Interval
                <select value={planForm.interval} onChange={(event) => setPlanForm((prev) => ({ ...prev, interval: event.target.value }))}>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </label>
              <label>
                Features (comma separated)
                <input value={planForm.features} onChange={(event) => setPlanForm((prev) => ({ ...prev, features: event.target.value }))} />
              </label>
              <label>
                Payment Gateway
                <select value={planForm.paymentGateway} onChange={(event) => setPlanForm((prev) => ({ ...prev, paymentGateway: event.target.value }))}>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
              </label>
              <button type="submit" className="admin-submit" disabled={isLoading}>{isLoading ? 'Saving…' : selectedPlan ? 'Update Plan' : 'Create Plan'}</button>
            </form>
            {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
          </div>
        );
      case 'payment':
        return (
          <div className="admin-table-panel">
            <h2>Payment Gateway</h2>
            <form className="admin-form-panel" onSubmit={handleUpdatePayment}>
              <label>
                Gateway
                <select value={paymentForm.gateway} onChange={(event) => setPaymentForm((prev) => ({ ...prev, gateway: event.target.value }))}>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
              </label>
              <label>
                Public Key
                <input value={paymentForm.publicKey} onChange={(event) => setPaymentForm((prev) => ({ ...prev, publicKey: event.target.value }))} />
              </label>
              <label>
                Webhook Secret
                <input value={paymentForm.webhookSecret} onChange={(event) => setPaymentForm((prev) => ({ ...prev, webhookSecret: event.target.value }))} />
              </label>
              <label className="admin-checkbox-label">
                <input type="checkbox" checked={paymentForm.enabled} onChange={(event) => setPaymentForm((prev) => ({ ...prev, enabled: event.target.checked }))} />
                Gateway enabled
              </label>
              <button className="admin-submit" type="submit" disabled={isLoading}>{isLoading ? 'Saving…' : 'Update Payment Config'}</button>
            </form>
            {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="admin-dashboard shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <h1>Pawapix Management</h1>
          <p>Manage gigs, creatives, users, plans, and payments from one central control panel.</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="secondary" onClick={onClose}>Back to Site</button>
          {adminToken && <button type="button" className="primary-btn" onClick={handleLogout}>Logout</button>}
        </div>
      </header>

      <div className="admin-grid-layout">
        <nav className="admin-side-nav">
          {ADMIN_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? 'active' : ''}
              onClick={() => setActiveSection(section.id)}>
              {section.label}
            </button>
          ))}
        </nav>

        <main className="admin-main-panel">
          {renderSection()}
        </main>
      </div>
    </section>
  );
}

export default AdminDashboard;
