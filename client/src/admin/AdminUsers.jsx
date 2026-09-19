import { useEffect, useState } from 'react';

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return { error: 'The server returned an invalid response.' };
  }
}

export default function AdminUsers({ adminToken, onError }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [messageForm, setMessageForm] = useState({ userId: '', subject: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = users.filter((user) => !normalizedSearch || [user.name, user.email, user.username, user.nationalId, user.role, user.specialty, user.location].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch)));

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'x-admin-token': adminToken }
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to load users.');
      setUsers(data);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    fetchUsers();
    const refreshTimer = window.setInterval(fetchUsers, 10000);
    return () => window.clearInterval(refreshTimer);
  }, [adminToken]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to delete user.');
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setStatus({ type: 'success', message: 'User removed successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSave = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ ...editingUser, servicePrice: Number(editingUser.servicePrice || 0), balance: Number(editingUser.balance || 0) })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update user.');
      setUsers((prev) => prev.map((user) => user.id === data.user.id ? data.user : user));
      setEditingUser(null);
      setStatus({ type: 'success', message: 'User details updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(messageForm)
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to send message.');
      setMessageForm((prev) => ({ ...prev, subject: '', message: '' }));
      setStatus({ type: data.delivered ? 'success' : 'error', message: data.message });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-section-panel">
      <div className="admin-section-header">
        <div>
          <p className="eyebrow">Users</p>
          <h2>Manage Registered Accounts</h2>
          <p>Review visitors, customers, creatives, and account roles from the admin console.</p>
        </div>
        <button type="button" className="secondary" onClick={fetchUsers} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh users'}
        </button>
      </div>

      <div className="admin-user-tools">
        <form className="admin-form-panel" onSubmit={handleSendMessage}>
          <h3>Send a general email</h3>
          <p>Send a message to one user or broadcast it to every registered user.</p>
          <label>Recipient<select value={messageForm.userId} onChange={(event) => setMessageForm((prev) => ({ ...prev, userId: event.target.value }))} required><option value="">Choose a recipient</option><option value="all">All users ({users.length})</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>
          <label>Subject<input value={messageForm.subject} onChange={(event) => setMessageForm((prev) => ({ ...prev, subject: event.target.value }))} required /></label>
          <label>Message<textarea rows="4" value={messageForm.message} onChange={(event) => setMessageForm((prev) => ({ ...prev, message: event.target.value }))} required /></label>
          <button type="submit" className="primary-btn" disabled={isLoading}>{isLoading ? 'Sending...' : messageForm.userId === 'all' ? 'Email all users' : 'Send email'}</button>
        </form>
        {editingUser && <form className="admin-form-panel" onSubmit={handleUserSave}>
          <h3>Edit user details</h3>
          <label>Name<input value={editingUser.name || ''} onChange={(event) => setEditingUser((prev) => ({ ...prev, name: event.target.value }))} required /></label>
          <label>Email<input type="email" value={editingUser.email || ''} onChange={(event) => setEditingUser((prev) => ({ ...prev, email: event.target.value }))} required /></label>
          <label>Username<input value={editingUser.username || ''} onChange={(event) => setEditingUser((prev) => ({ ...prev, username: event.target.value }))} required /></label>
          <label>National ID<input value={editingUser.nationalId || ''} onChange={(event) => setEditingUser((prev) => ({ ...prev, nationalId: event.target.value }))} required /></label>
          <label>Role<select value={editingUser.role || 'customer'} onChange={(event) => setEditingUser((prev) => ({ ...prev, role: event.target.value }))}><option value="customer">Customer</option><option value="creative">Creative</option></select></label>
          <label>Specialty<input value={editingUser.specialty || ''} onChange={(event) => setEditingUser((prev) => ({ ...prev, specialty: event.target.value }))} /></label>
          <label>Location<input value={editingUser.location || ''} onChange={(event) => setEditingUser((prev) => ({ ...prev, location: event.target.value }))} /></label>
          <label>Service price<input type="number" min="0" value={editingUser.servicePrice || 0} onChange={(event) => setEditingUser((prev) => ({ ...prev, servicePrice: event.target.value }))} /></label>
          <label>Balance<input type="number" min="0" value={editingUser.balance || 0} onChange={(event) => setEditingUser((prev) => ({ ...prev, balance: event.target.value }))} /></label>
          <div className="dashboard-form-actions"><button type="submit" className="primary-btn" disabled={isLoading}>Save user</button><button type="button" className="secondary" onClick={() => setEditingUser(null)}>Cancel</button></div>
        </form>}
      </div>

      <div className="admin-user-search">
        <label htmlFor="admin-user-search-input">Search users</label>
        <input id="admin-user-search-input" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name, email, username, role, or National ID" />
        <span>{filteredUsers.length} of {users.length} users</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>National ID</th>
              <th>Role</th>
              <th>Specialty</th>
              <th>Location</th>
              <th>Service Price</th>
              <th>Profile</th>
              <th>Balance</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="13" className="admin-empty-state">{users.length === 0 ? 'No users found.' : 'No users match your search.'}</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>@{user.username || '-'}</td>
                  <td>{user.nationalId || '-'}</td>
                  <td>{user.role}</td>
                  <td>{user.role === 'creative' ? user.specialty || 'Not set' : '-'}</td>
                  <td>{user.role === 'creative' ? user.location || 'Remote' : '-'}</td>
                  <td>{user.role === 'creative' && Number(user.servicePrice || 0) > 0 ? `NGN ${Number(user.servicePrice).toLocaleString()}` : '-'}</td>
                  <td>{user.profilePicUrl ? <img src={user.profilePicUrl} alt={`${user.name} profile`} className="admin-user-avatar" /> : '-'}</td>
                  <td>NGN {Number(user.balance || 0).toLocaleString()}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button type="button" className="secondary small" onClick={() => setEditingUser({ ...user })} disabled={isLoading}>
                      Edit
                    </button>
                    <button type="button" className="secondary small" onClick={() => handleDelete(user.id)} disabled={isLoading}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {status.message && <p className={`admin-status ${status.type}`}>{status.message}</p>}
    </div>
  );
}
