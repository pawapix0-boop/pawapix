import { useEffect, useState } from 'react';
import AdminUsers from './AdminUsers';
import AdminChat from './AdminChat';

const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'services', label: 'Services' },
  { id: 'providers', label: 'Providers' },
  { id: 'applications', label: 'Applications' },
  { id: 'support', label: 'Support' },
  { id: 'finance', label: 'Finance' },
  { id: 'cloud', label: 'Work Cloud' },
  { id: 'chat', label: 'Secure chat' },
  { id: 'plans', label: 'Plans' },
  { id: 'payment', label: 'Payment' },
  { id: 'settings', label: 'Site settings' }
];

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return { error: text || 'Request failed.' };
  }
}

function formatNaira(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

export default function AdminDashboard({ initialToken, onClose, onLoginSuccess, onLogout }) {
  const [adminToken, setAdminToken] = useState(initialToken || '');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [dashboardStats, setDashboardStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [applications, setApplications] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [finance, setFinance] = useState({ deposits: [], withdrawals: [], totals: {} });
  const [withdrawalSettings, setWithdrawalSettings] = useState({ enabled: true, creativesEnabled: true, minimumAmount: 1, maximumAmount: 1000000, fixedFee: 0, percentageFee: 0, processingTime: '1-3 business days' });
  const [cloudStats, setCloudStats] = useState({ files: 0, storageBytes: 0, transfers: 0, activeTransfers: 0 });
  const [selectedCreativeIds, setSelectedCreativeIds] = useState({});
  const [completingApplicationId, setCompletingApplicationId] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({ gateway: 'stripe', enabled: true, publicKey: '', webhookSecret: '', gateways: ['stripe', 'paypal'] });
  const [newGateway, setNewGateway] = useState('');
  const [planForm, setPlanForm] = useState({ name: '', price: 0, interval: 'month', currency: 'NGN', features: '' });
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [serviceForm, setServiceForm] = useState({ title: '', creative: '', price: 0, delivery: '', description: '', tags: '' });
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [siteSettings, setSiteSettings] = useState({ socialLinks: { Facebook: '', Instagram: '', X: '' }, supportContacts: { email: '', phone: '', whatsapp: '' } });
  const [testimonialForm, setTestimonialForm] = useState({ quote: '', name: '', role: '', initials: '' });
  const [editingTestimonialId, setEditingTestimonialId] = useState(null);

  const handleSessionExpired = () => {
    setAdminToken('');
    window.localStorage.removeItem('pawapixAdminToken');
    setStatus({ type: 'error', message: 'Your admin session expired. Please sign in again.' });
  };

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
        const response = await fetch('/api/admin/me', {
          headers: { 'x-admin-token': adminToken }
        });
        const data = await readJsonResponse(response);
        if (!response.ok) throw new Error(data.error || 'Invalid session');
        await fetchDashboardData();
      } catch (error) {
        handleSessionExpired();
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdmin();
  }, [adminToken]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashboardRes, plansRes, applicationsRes, creativesRes, gigsRes, contactsRes, financeRes, siteSettingsRes, withdrawalSettingsRes, cloudRes] = await Promise.all([
        fetch('/api/admin/dashboard', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/plans', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/applications', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/creatives', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/gigs', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/contacts', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/finance', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/site-settings', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/withdrawal-settings', { headers: { 'x-admin-token': adminToken } }),
        fetch('/api/admin/cloud', { headers: { 'x-admin-token': adminToken } })
      ]);
      const dashboardData = await readJsonResponse(dashboardRes);
      const plansData = await readJsonResponse(plansRes);
      const applicationsData = await readJsonResponse(applicationsRes);
      const creativesData = await readJsonResponse(creativesRes);
      const gigsData = await readJsonResponse(gigsRes);
      const contactsData = await readJsonResponse(contactsRes);
      const financeData = await readJsonResponse(financeRes);
      const siteSettingsData = await readJsonResponse(siteSettingsRes);
      const withdrawalSettingsData = await readJsonResponse(withdrawalSettingsRes);
      const cloudData = await readJsonResponse(cloudRes);
      if (!dashboardRes.ok) throw new Error(dashboardData.error || 'Unable to load dashboard');
      if (!plansRes.ok) throw new Error(plansData.error || 'Unable to load plans');
      if (!applicationsRes.ok) throw new Error(applicationsData.error || 'Unable to load applications');
      if (!creativesRes.ok) throw new Error(creativesData.error || 'Unable to load creatives');
      if (!gigsRes.ok) throw new Error(gigsData.error || 'Unable to load services');
      if (!contactsRes.ok) throw new Error(contactsData.error || 'Unable to load support records');
      if (!financeRes.ok) throw new Error(financeData.error || 'Unable to load finance records');
      if (!siteSettingsRes.ok) throw new Error(siteSettingsData.error || 'Unable to load site settings');
      if (!withdrawalSettingsRes.ok) throw new Error(withdrawalSettingsData.error || 'Unable to load withdrawal settings');
      if (!cloudRes.ok) throw new Error(cloudData.error || 'Unable to load cloud stats');
      setDashboardStats(dashboardData);
      setPlans(plansData);
      setApplications(Array.isArray(applicationsData) ? applicationsData : []);
      setCreatives(Array.isArray(creativesData) ? creativesData : []);
      setGigs(Array.isArray(gigsData) ? gigsData : []);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setFinance(financeData);
      setSiteSettings(siteSettingsData);
      setWithdrawalSettings(withdrawalSettingsData);
      setCloudStats(cloudData);
      setPaymentConfig(dashboardData.paymentConfig);
    } catch (error) {
      if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('session')) {
        handleSessionExpired();
        return;
      }
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
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Login failed');
      setAdminToken(data.token);
      window.localStorage.setItem('pawapixAdminToken', data.token);
      setStatus({ type: 'success', message: 'Welcome back, admin.' });
      if (onLoginSuccess) onLoginSuccess(data.token);
      setActiveSection('dashboard');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    window.localStorage.removeItem('pawapixAdminToken');
    setStatus({ type: 'success', message: 'Logged out successfully.' });
    if (onLogout) onLogout();
  };

  const handleCompleteApplication = async (applicationId) => {
    setCompletingApplicationId(applicationId);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ creativeId: selectedCreativeIds[applicationId] || '' })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to complete application');
      setApplications((prev) => prev.map((item) => item.id === applicationId ? { ...item, status: 'completed' } : item));
      setStatus({ type: 'success', message: 'Application marked complete.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setCompletingApplicationId(null);
    }
  };

  const handleCreatePlan = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const response = await fetch(editingPlanId ? `/api/admin/plans/${editingPlanId}` : '/api/admin/plans', {
        method: editingPlanId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          ...planForm,
          price: Number(planForm.price),
          features: planForm.features.split(',').map((feature) => feature.trim()).filter(Boolean)
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to create plan');
      setPlans((prev) => editingPlanId ? prev.map((item) => item.id === editingPlanId ? data : item) : [data, ...prev]);
      setStatus({ type: 'success', message: editingPlanId ? 'Plan updated successfully.' : 'Plan added successfully.' });
      setPlanForm({ name: '', price: 0, interval: 'month', currency: 'NGN', features: '' });
      setEditingPlanId(null);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    const payload = { ...serviceForm, price: Number(serviceForm.price), tags: serviceForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean) };
    try {
      const response = await fetch(editingServiceId ? `/api/admin/gigs/${editingServiceId}` : '/api/admin/gigs', {
        method: editingServiceId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(payload)
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to save service.');
      setGigs((prev) => editingServiceId ? prev.map((item) => item.id === editingServiceId ? data : item) : [data, ...prev]);
      setServiceForm({ title: '', creative: '', price: 0, delivery: '', description: '', tags: '' });
      setEditingServiceId(null);
      setStatus({ type: 'success', message: editingServiceId ? 'Service updated.' : 'Service created.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanAction = async (plan, action) => {
    if (action === 'delete' && !window.confirm('Delete this plan?')) return;
    const isDelete = action === 'delete';
    const endpoint = action === 'duplicate' ? '/api/admin/plans' : `/api/admin/plans/${plan.id}`;
    const response = await fetch(endpoint, {
      method: isDelete ? 'DELETE' : action === 'duplicate' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: isDelete ? undefined : JSON.stringify(action === 'duplicate' ? { ...plan, name: `${plan.name} (Copy)` } : plan)
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return setStatus({ type: 'error', message: data.error || 'Unable to update plan.' });
    setPlans((prev) => isDelete ? prev.filter((item) => item.id !== plan.id) : action === 'duplicate' ? [data, ...prev] : prev.map((item) => item.id === plan.id ? data : item));
    setStatus({ type: 'success', message: isDelete ? 'Plan deleted.' : action === 'duplicate' ? 'Plan duplicated.' : 'Plan updated.' });
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    const response = await fetch(`/api/admin/gigs/${id}`, { method: 'DELETE', headers: { 'x-admin-token': adminToken } });
    const data = await readJsonResponse(response);
    if (!response.ok) return setStatus({ type: 'error', message: data.error || 'Unable to delete service.' });
    setGigs((prev) => prev.filter((item) => item.id !== id));
    setStatus({ type: 'success', message: 'Service deleted.' });
  };

  const handleDuplicateService = async (service) => {
    const response = await fetch('/api/admin/gigs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ ...service, title: `${service.title} (Copy)` })
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return setStatus({ type: 'error', message: data.error || 'Unable to duplicate service.' });
    setGigs((prev) => [data, ...prev]);
    setStatus({ type: 'success', message: 'Service duplicated.' });
  };

  const handleUpdatePayment = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const response = await fetch('/api/admin/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(paymentConfig)
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update payment configuration');
      setPaymentConfig(data);
      setStatus({ type: 'success', message: 'Payment config updated.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSiteSettings = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(siteSettings)
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update social handles.');
      setSiteSettings(data);
      window.localStorage.setItem('pawapixSiteSettingsUpdated', String(Date.now()));
      window.dispatchEvent(new Event('pawapix-site-settings-updated'));
      setStatus({ type: 'success', message: 'Site settings saved successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestimonialSubmit = (event) => {
    event.preventDefault();
    const nextTestimonial = { ...testimonialForm, id: editingTestimonialId || `testimonial-${Date.now()}` };
    const testimonials = editingTestimonialId
      ? (siteSettings.testimonials || []).map((item) => item.id === editingTestimonialId ? nextTestimonial : item)
      : [...(siteSettings.testimonials || []), nextTestimonial];
    setSiteSettings((prev) => ({ ...prev, testimonials }));
    setTestimonialForm({ quote: '', name: '', role: '', initials: '' });
    setEditingTestimonialId(null);
    setStatus({ type: 'success', message: editingTestimonialId ? 'Testimonial updated. Save site settings to publish it.' : 'Testimonial added. Save site settings to publish it.' });
  };

  const handleDeleteTestimonial = (id) => {
    if (!window.confirm('Remove this testimonial?')) return;
    setSiteSettings((prev) => ({ ...prev, testimonials: (prev.testimonials || []).filter((item) => item.id !== id) }));
    if (editingTestimonialId === id) {
      setEditingTestimonialId(null);
      setTestimonialForm({ quote: '', name: '', role: '', initials: '' });
    }
    setStatus({ type: 'success', message: 'Testimonial removed. Save site settings to publish the change.' });
  };

  const handleUpdateWithdrawalStatus = async (withdrawal, status) => {
    const reason = status === 'rejected' || status === 'failed' ? window.prompt('Enter a reason:') : '';
    if ((status === 'rejected' || status === 'failed') && !reason?.trim()) return;
    const reference = status === 'completed' ? window.prompt('Enter the payment reference:') : '';
    if (status === 'completed' && !reference?.trim()) return;
    const response = await fetch(`/api/admin/withdrawals/${withdrawal.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ status, reason, reference })
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return setStatus({ type: 'error', message: data.error || 'Unable to update withdrawal.' });
    setFinance((prev) => ({ ...prev, withdrawals: prev.withdrawals.map((item) => item.id === withdrawal.id ? data.withdrawal : item) }));
    setStatus({ type: 'success', message: `Withdrawal marked ${status}.` });
  };

  const handleUpdateWithdrawalSettings = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/admin/withdrawal-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify(withdrawalSettings)
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return setStatus({ type: 'error', message: data.error || 'Unable to save withdrawal settings.' });
    setWithdrawalSettings(data);
    setStatus({ type: 'success', message: 'Withdrawal settings updated.' });
  };

  const renderPage = () => {
    if (!adminToken) {
      return (
        <div className="admin-login-panel">
          <h2>Admin Sign In</h2>
          <p>Only authorized admins can access the management console.</p>
          <form className="admin-login-form" onSubmit={handleLogin}>
            <label>
              Email
              <input type="email" value={loginForm.email} onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))} required />
            </label>
            <label>
              Password
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))} required />
            </label>
            <button type="submit" className="primary-btn" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
        </div>
      );
    }

    if (activeSection === 'users') {
      return <AdminUsers adminToken={adminToken} onError={(error) => setStatus({ type: 'error', message: error.message })} />;
    }

    if (activeSection === 'chat') {
      return <AdminChat adminToken={adminToken} />;
    }

    if (activeSection === 'services' || activeSection === 'providers' || activeSection === 'support') {
      const records = activeSection === 'services' ? gigs : activeSection === 'providers' ? creatives : contacts;
      const title = activeSection === 'services' ? 'Services marketplace' : activeSection === 'providers' ? 'Service providers' : 'Support and inquiries';
      const description = activeSection === 'services'
        ? 'Review published services, pricing, delivery windows, and ratings.'
        : activeSection === 'providers'
          ? 'Review provider profiles, specialties, locations, and ratings.'
          : 'Review contact messages and customer support requests.';

      return (
        <div className="admin-section-panel">
          <div className="admin-section-header">
            <div><p className="eyebrow">{title}</p><h2>{title}</h2><p>{description}</p></div>
            <span className="admin-section-count">{records.length} records</span>
          </div>
          {activeSection === 'services' && <form className="admin-form-panel admin-inline-form" onSubmit={handleServiceSubmit}>
            <h3>{editingServiceId ? 'Edit service' : 'Create service'}</h3>
            <label>Service name<input value={serviceForm.title} onChange={(event) => setServiceForm((prev) => ({ ...prev, title: event.target.value }))} required /></label>
            <label>Creative / provider<input value={serviceForm.creative} onChange={(event) => setServiceForm((prev) => ({ ...prev, creative: event.target.value }))} required /></label>
            <label>Price<input type="number" min="0" value={serviceForm.price} onChange={(event) => setServiceForm((prev) => ({ ...prev, price: event.target.value }))} required /></label>
            <label>Delivery<input value={serviceForm.delivery} onChange={(event) => setServiceForm((prev) => ({ ...prev, delivery: event.target.value }))} placeholder="7 days" /></label>
            <label>Description<textarea rows="3" value={serviceForm.description} onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))} required /></label>
            <label>Tags<input value={serviceForm.tags} onChange={(event) => setServiceForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Branding, Identity" /></label>
            <div className="dashboard-form-actions"><button type="submit" className="primary-btn" disabled={isLoading}>{editingServiceId ? 'Update service' : 'Create service'}</button>{editingServiceId && <button type="button" className="secondary" onClick={() => { setEditingServiceId(null); setServiceForm({ title: '', creative: '', price: 0, delivery: '', description: '', tags: '' }); }}>Cancel</button>}</div>
          </form>}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Name / Subject</th><th>Category / Specialty</th><th>Status / Location</th><th>Value / Rating</th><th>Created</th>{activeSection === 'services' && <th>Actions</th>}
              </tr></thead>
              <tbody>
                {records.length === 0 ? <tr><td colSpan={activeSection === 'services' ? 6 : 5} className="admin-empty-state">No records found.</td></tr> : records.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.title || record.name || record.subject || 'Untitled record'}</strong>{record.email && <small>{record.email}</small>}</td>
                    <td>{record.tags?.join(', ') || record.specialty || record.type || 'General'}</td>
                    <td>{record.status || record.location || 'Active'}</td>
                    <td>{record.price !== undefined ? formatNaira(record.price) : record.rating ? `${record.rating} / 5` : '—'}</td>
                    <td>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—'}</td>
                    {activeSection === 'services' && <td><div className="admin-row-actions"><button type="button" className="secondary small" onClick={() => { setEditingServiceId(record.id); setServiceForm({ title: record.title || '', creative: record.creative || '', price: record.price || 0, delivery: record.delivery || '', description: record.description || '', tags: (record.tags || []).join(', ') }); }}>Edit</button><button type="button" className="secondary small" onClick={() => handleDuplicateService(record)}>Duplicate</button><button type="button" className="secondary small danger" onClick={() => handleDeleteService(record.id)}>Delete</button></div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeSection === 'finance') {
      return (
        <div className="admin-section-panel">
          <div className="admin-section-header"><div><p className="eyebrow">Finance</p><h2>Payments and payouts</h2><p>Monitor customer deposits and provider withdrawal requests.</p></div></div>
          <div className="admin-overview-grid">
            <article className="admin-stat-card"><h3>Total deposits</h3><strong>{formatNaira(finance.totals.deposits)}</strong></article>
            <article className="admin-stat-card"><h3>Total withdrawals</h3><strong>{formatNaira(finance.totals.withdrawals)}</strong></article>
            <article className="admin-stat-card"><h3>Pending payouts</h3><strong>{finance.totals.pendingWithdrawals || 0}</strong></article>
          </div>
          <div className="admin-section-block">
            <div className="admin-card"><h3>Recent deposits</h3><div className="admin-record-list">{finance.deposits.slice(0, 8).map((item) => <p key={item.id}>Deposit <strong>{formatNaira(item.amount)}</strong> via {item.method} <small>{new Date(item.createdAt).toLocaleDateString()}</small></p>)}</div></div>
            <div className="admin-card"><h3>Withdrawal requests</h3><div className="admin-record-list">{finance.withdrawals.slice(0, 8).map((item) => <div key={item.id}><p>Withdrawal <strong>{formatNaira(item.amount)}</strong> <span className="admin-status">{item.status}</span></p><small>Fee {formatNaira(item.fee)} · Net {formatNaira(item.netAmount ?? item.amount)}</small><div className="admin-row-actions">{item.status === 'pending' && <button type="button" className="secondary small" onClick={() => handleUpdateWithdrawalStatus(item, 'under-review')}>Review</button>}{['under-review', 'pending'].includes(item.status) && <button type="button" className="secondary small" onClick={() => handleUpdateWithdrawalStatus(item, 'approved')}>Approve</button>}{['approved', 'processing'].includes(item.status) && <button type="button" className="secondary small" onClick={() => handleUpdateWithdrawalStatus(item, item.status === 'approved' ? 'processing' : 'completed')}>{item.status === 'approved' ? 'Process' : 'Complete'}</button>}{!['completed', 'rejected', 'failed', 'cancelled'].includes(item.status) && <button type="button" className="secondary small danger" onClick={() => handleUpdateWithdrawalStatus(item, 'rejected')}>Reject</button>}</div></div>)}</div></div>
          </div>
          <form className="admin-form-panel" onSubmit={handleUpdateWithdrawalSettings}><h3>Withdrawal settings</h3><label><input type="checkbox" checked={withdrawalSettings.enabled} onChange={(event) => setWithdrawalSettings((prev) => ({ ...prev, enabled: event.target.checked }))} /> Enable withdrawals</label><label>Minimum amount<input type="number" min="0" value={withdrawalSettings.minimumAmount} onChange={(event) => setWithdrawalSettings((prev) => ({ ...prev, minimumAmount: event.target.value }))} /></label><label>Maximum amount<input type="number" min="0" value={withdrawalSettings.maximumAmount} onChange={(event) => setWithdrawalSettings((prev) => ({ ...prev, maximumAmount: event.target.value }))} /></label><label>Fixed fee<input type="number" min="0" value={withdrawalSettings.fixedFee} onChange={(event) => setWithdrawalSettings((prev) => ({ ...prev, fixedFee: event.target.value }))} /></label><label>Percentage fee<input type="number" min="0" max="100" value={withdrawalSettings.percentageFee} onChange={(event) => setWithdrawalSettings((prev) => ({ ...prev, percentageFee: event.target.value }))} /></label><label>Processing time<input value={withdrawalSettings.processingTime} onChange={(event) => setWithdrawalSettings((prev) => ({ ...prev, processingTime: event.target.value }))} /></label><button type="submit" className="primary-btn">Save withdrawal settings</button>{status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}</form>
        </div>
      );
    }

    if (activeSection === 'cloud') {
      return <div className="admin-section-panel"><div className="admin-section-header"><div><p className="eyebrow">Work Cloud</p><h2>Cloud activity overview</h2><p>Monitor file metadata and transfers without exposing private file contents.</p></div></div><div className="admin-overview-grid"><article className="admin-stat-card"><h3>Total files</h3><strong>{cloudStats.files}</strong></article><article className="admin-stat-card"><h3>Storage used</h3><strong>{(Number(cloudStats.storageBytes || 0) / 1048576).toFixed(1)} MB</strong></article><article className="admin-stat-card"><h3>Total transfers</h3><strong>{cloudStats.transfers}</strong></article><article className="admin-stat-card"><h3>Active transfers</h3><strong>{cloudStats.activeTransfers}</strong></article></div></div>;
    }

    if (activeSection === 'applications') {
      return (
        <div className="admin-section-panel">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Applications</p>
              <h2>Project applications and delivery status</h2>
              <p>Select the assigned creative and mark each project as complete when work is finished.</p>
            </div>
          </div>

          <div className="admin-card-grid">
            {applications.map((application) => (
              <article key={application.id} className="admin-plan-card">
                <h3>{application.projectType || 'Project application'}</h3>
                <p><strong>Client:</strong> {application.name || 'Anonymous'}</p>
                <p><strong>Status:</strong> {application.status || 'received'}</p>
                <p><strong>Message:</strong> {application.message || 'No details provided.'}</p>
                <label>
                  Assigned creative
                  <select
                    value={selectedCreativeIds[application.id] || ''}
                    onChange={(event) => setSelectedCreativeIds((prev) => ({ ...prev, [application.id]: event.target.value }))}
                    disabled={application.status === 'completed'}
                  >
                    <option value="">Choose a creative</option>
                    {creatives.map((creative) => (
                      <option key={creative.id} value={creative.id}>{creative.name}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={application.status === 'completed' || completingApplicationId === application.id}
                  onClick={() => handleCompleteApplication(application.id)}
                >
                  {application.status === 'completed' ? 'Completed' : completingApplicationId === application.id ? 'Completing…' : 'Mark complete'}
                </button>
              </article>
            ))}
          </div>
          {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
        </div>
      );
    }

    if (activeSection === 'plans') {
      return (
        <div className="admin-section-panel">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Plans</p>
              <h2>Subscription and pricing plans</h2>
              <p>Build new offerings, update pricing, and keep plan features current.</p>
            </div>
          </div>

          <div className="admin-card-grid">
            {plans.map((plan) => (
              <article key={plan.id} className="admin-plan-card">
                <h3>{plan.name}</h3>
                <p className="plan-price">{plan.currency} {plan.price}/{plan.interval}</p>
                <div className="plan-features">
                  {plan.features.map((feature) => (<span key={feature}>{feature}</span>))}
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="secondary small" onClick={() => { setEditingPlanId(plan.id); setPlanForm({ name: plan.name || '', price: plan.price || 0, interval: plan.interval || 'month', currency: 'NGN', features: (plan.features || []).join(', ') }); }}>Edit</button>
                  <button type="button" className="secondary small" onClick={() => handlePlanAction(plan, 'duplicate')}>Duplicate</button>
                  <button type="button" className="secondary small danger" onClick={() => handlePlanAction(plan, 'delete')}>Delete</button>
                </div>
              </article>
            ))}
          </div>

          <form className="admin-form-panel" onSubmit={handleCreatePlan}>
            <h3>{editingPlanId ? 'Edit Plan' : 'Create New Plan'}</h3>
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
            <div className="dashboard-form-actions"><button type="submit" className="primary-btn" disabled={isLoading}>{isLoading ? 'Saving…' : editingPlanId ? 'Update Plan' : 'Create Plan'}</button>{editingPlanId && <button type="button" className="secondary" onClick={() => { setEditingPlanId(null); setPlanForm({ name: '', price: 0, interval: 'month', currency: 'NGN', features: '' }); }}>Cancel</button>}</div>
          </form>
          {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
        </div>
      );
    }

    if (activeSection === 'payment') {
      return (
        <div className="admin-section-panel">
          <div className="admin-section-header">
            <div>
              <p className="eyebrow">Payment</p>
              <h2>Payment gateway configuration</h2>
              <p>Update the active gateway and keys used by your checkout flow.</p>
            </div>
          </div>

          <form className="admin-form-panel" onSubmit={handleUpdatePayment}>
            <label>
              Gateway
              <select value={paymentConfig?.gateway || ''} onChange={(event) => setPaymentConfig((prev) => ({ ...prev, gateway: event.target.value }))}>
                {(paymentConfig?.gateways || []).map((gateway) => <option key={gateway} value={gateway}>{gateway}</option>)}
              </select>
            </label>
            <label>
              Payment gateways
              <div className="admin-gateway-list">
                {(paymentConfig?.gateways || []).map((gateway) => <span key={gateway} className="admin-gateway-chip">{gateway}<button type="button" aria-label={`Remove ${gateway}`} onClick={() => setPaymentConfig((prev) => ({ ...prev, gateways: prev.gateways.filter((item) => item !== gateway), gateway: prev.gateway === gateway ? prev.gateways.find((item) => item !== gateway) || '' : prev.gateway }))}>×</button></span>)}
              </div>
              <div className="admin-add-gateway"><input value={newGateway} onChange={(event) => setNewGateway(event.target.value)} placeholder="paystack, flutterwave" /><button type="button" className="secondary" onClick={() => { const gateway = newGateway.trim().toLowerCase(); if (!gateway || (paymentConfig?.gateways || []).includes(gateway)) return; setPaymentConfig((prev) => ({ ...prev, gateways: [...prev.gateways, gateway], gateway: prev.gateway || gateway })); setNewGateway(''); }}>Add gateway</button></div>
            </label>
            <label>
              Public Key
              <input value={paymentConfig?.publicKey || ''} onChange={(event) => setPaymentConfig((prev) => ({ ...prev, publicKey: event.target.value }))} />
            </label>
            <label>
              Webhook Secret
              <input
                type="password"
                value={paymentConfig?.webhookSecret || ''}
                onChange={(event) => setPaymentConfig((prev) => ({ ...prev, webhookSecret: event.target.value }))}
                placeholder={paymentConfig?.webhookSecretConfigured ? 'Leave blank to keep current secret' : 'Enter webhook secret'}
                autoComplete="new-password"
              />
            </label>
            <label>
              Available payment methods
              <input value={(paymentConfig?.methods || []).join(', ')} onChange={(event) => setPaymentConfig((prev) => ({ ...prev, methods: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} placeholder="Card, Bank transfer, USSD" />
            </label>
            <label>
              Supported currencies
              <input value="NGN" readOnly />
            </label>
            <label>
              Platform commission (%)
              <input type="number" min="0" max="100" value={paymentConfig?.commissionRate ?? 10} onChange={(event) => setPaymentConfig((prev) => ({ ...prev, commissionRate: Number(event.target.value) }))} />
            </label>
            <label>
              Minimum payment
              <input type="number" min="0" value={paymentConfig?.minimumPayment ?? 1} onChange={(event) => setPaymentConfig((prev) => ({ ...prev, minimumPayment: Number(event.target.value) }))} />
            </label>
            <label className="admin-checkbox-label">
              <input type="checkbox" checked={paymentConfig?.enabled || false} onChange={(event) => setPaymentConfig((prev) => ({ ...prev, enabled: event.target.checked }))} />
              Gateway enabled
            </label>
            <button type="submit" className="primary-btn" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save Payment Settings'}</button>
          </form>
          {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
        </div>
      );
    }

    if (activeSection === 'settings') {
      return (
        <div className="admin-section-panel">
          <div className="admin-section-header"><div><p className="eyebrow">Site settings</p><h2>Social media and testimonials</h2><p>Manage the public footer links and the customer stories shown on the home page.</p></div></div>
          <form className="admin-form-panel" onSubmit={handleUpdateSiteSettings}>
            {['Facebook', 'Instagram', 'X'].map((name) => <label key={name}>{name}<input type="url" value={siteSettings.socialLinks?.[name] || ''} onChange={(event) => setSiteSettings((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, [name]: event.target.value } }))} placeholder={`https://${name.toLowerCase()}.com/your-handle`} required /></label>)}
            <div className="admin-support-editor"><h3>Footer support contacts</h3><label>Support email<input type="email" value={siteSettings.supportContacts?.email || ''} onChange={(event) => setSiteSettings((prev) => ({ ...prev, supportContacts: { ...prev.supportContacts, email: event.target.value } }))} required /></label><label>Phone number<input value={siteSettings.supportContacts?.phone || ''} onChange={(event) => setSiteSettings((prev) => ({ ...prev, supportContacts: { ...prev.supportContacts, phone: event.target.value } }))} required /></label><label>WhatsApp number<input value={siteSettings.supportContacts?.whatsapp || ''} onChange={(event) => setSiteSettings((prev) => ({ ...prev, supportContacts: { ...prev.supportContacts, whatsapp: event.target.value } }))} required /></label></div>
            <div className="admin-legal-editor"><h3>Legal pages</h3><p>Edit the text that opens from the public footer links. Click Save site settings below to save all changes.</p>{[['terms', 'Terms of Service'], ['privacy', 'Privacy Policy'], ['sitemap', 'Sitemap']].map(([key, label]) => <label key={key}>{label}<textarea rows="8" value={siteSettings.legalPages?.[key] || ''} onChange={(event) => setSiteSettings((prev) => ({ ...prev, legalPages: { ...prev.legalPages, [key]: event.target.value } }))} required /></label>)}</div>
            <button type="submit" className="primary-btn" disabled={isLoading}>{isLoading ? 'Saving…' : 'Save site settings'}</button>
          </form>
          <div className="admin-testimonials-panel" id="testimonials">
            <div className="admin-section-header"><div><p className="eyebrow">Home page content</p><h3>Customer testimonials</h3><p>Add, edit, or remove the stories displayed on the home page.</p></div></div>
            <div className="admin-testimonial-list">{(siteSettings.testimonials || []).map((testimonial) => <article key={testimonial.id} className="admin-testimonial-item"><div><strong>{testimonial.name}</strong><span>{testimonial.role}</span><p>“{testimonial.quote}”</p></div><div className="admin-row-actions"><button type="button" className="secondary small" onClick={() => { setEditingTestimonialId(testimonial.id); setTestimonialForm({ quote: testimonial.quote || '', name: testimonial.name || '', role: testimonial.role || '', initials: testimonial.initials || '' }); }}>Edit</button><button type="button" className="secondary small danger" onClick={() => handleDeleteTestimonial(testimonial.id)}>Delete</button></div></article>)}</div>
            <form className="admin-form-panel" onSubmit={handleTestimonialSubmit}>
              <h3>{editingTestimonialId ? 'Edit testimonial' : 'Add testimonial'}</h3>
              <label>Customer name<input value={testimonialForm.name} onChange={(event) => setTestimonialForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label>Role or company<input value={testimonialForm.role} onChange={(event) => setTestimonialForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="Founder, Northline" /></label>
              <label>Initials<input maxLength="4" value={testimonialForm.initials} onChange={(event) => setTestimonialForm((prev) => ({ ...prev, initials: event.target.value.toUpperCase() }))} placeholder="AB" /></label>
              <label>Testimonial<textarea rows="4" value={testimonialForm.quote} onChange={(event) => setTestimonialForm((prev) => ({ ...prev, quote: event.target.value }))} required /></label>
              <div className="dashboard-form-actions"><button type="submit" className="primary-btn">{editingTestimonialId ? 'Update testimonial' : 'Add testimonial'}</button>{editingTestimonialId && <button type="button" className="secondary" onClick={() => { setEditingTestimonialId(null); setTestimonialForm({ quote: '', name: '', role: '', initials: '' }); }}>Cancel</button>}</div>
            </form>
            <p className="admin-testimonial-save-note">After adding or editing a testimonial, click <strong>Save site settings</strong> above to publish the changes to the home page.</p>
          </div>
          {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
        </div>
      );
    }

    return (
      <div className="admin-section-panel admin-dashboard-overview">
        <div className="admin-overview-grid">
          <article className="admin-stat-card">
            <h3>Total Gigs</h3>
            <strong>{dashboardStats?.stats?.gigs || 0}</strong>
          </article>
          <article className="admin-stat-card">
            <h3>Total Creatives</h3>
            <strong>{dashboardStats?.stats?.creatives || 0}</strong>
          </article>
          <article className="admin-stat-card">
            <h3>Applications</h3>
            <strong>{dashboardStats?.stats?.applications || 0}</strong>
          </article>
          <article className="admin-stat-card">
            <h3>Users</h3>
            <strong>{dashboardStats?.stats?.users || 0}</strong>
          </article>
          <article className="admin-stat-card">
            <h3>Completed bookings</h3>
            <strong>{dashboardStats?.stats?.completedApplications || 0}</strong>
          </article>
          <article className="admin-stat-card">
            <h3>Pending payouts</h3>
            <strong>{dashboardStats?.stats?.pendingWithdrawals || 0}</strong>
          </article>
        </div>

        <div className="admin-section-block">
          <div className="admin-card admin-payment-card">
            <h3>Payment Config</h3>
            <p><strong>Gateway:</strong> {paymentConfig?.gateway}</p>
            <p><strong>Status:</strong> {paymentConfig?.enabled ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Public Key:</strong> {paymentConfig?.publicKey}</p>
          </div>
          <div className="admin-card admin-plans-card">
            <h3>Recent Plans</h3>
            <ul>
              {plans.slice(0, 3).map((plan) => (
                <li key={plan.id}>{plan.name} — {plan.currency} {plan.price}/{plan.interval}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1>Pawapix Control Center</h1>
        </div>
        <div className="admin-topbar-actions">
          <button type="button" className="secondary" onClick={onClose}>Return to site</button>
          {adminToken && <button type="button" className="primary-btn" onClick={handleLogout}>Logout</button>}
        </div>
      </div>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          {ADMIN_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSection ? 'admin-sidebar-item active' : 'admin-sidebar-item'}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </aside>

        <main className="admin-main">
          {renderPage()}
        </main>
      </div>
    </section>
  );
}
