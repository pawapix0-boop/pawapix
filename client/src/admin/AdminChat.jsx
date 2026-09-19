import { useEffect, useState } from 'react';
import { decryptChatMessage, deriveChatKey, encryptChatMessage, getChatIdentity } from '../utils/chatCrypto';

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch (error) { return { error: 'The server returned an invalid response.' }; }
}

export default function AdminChat({ adminToken }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [identity, setIdentity] = useState(null);
  const [sharedKey, setSharedKey] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  useEffect(() => {
    fetch('/api/admin/users', { headers: { 'x-admin-token': adminToken } }).then(readJsonResponse).then(setUsers).catch(() => setStatus({ type: 'error', message: 'Unable to load users.' }));
    getChatIdentity('admin').then(async (nextIdentity) => {
      setIdentity(nextIdentity);
      const response = await fetch('/api/admin/chat/key', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify({ publicKey: nextIdentity.publicKeyJwk }) });
      if (!response.ok) throw new Error('Unable to initialize secure chat.');
    }).catch(() => setStatus({ type: 'error', message: 'Secure chat is not supported by this browser.' }));
  }, [adminToken]);

  const openConversation = async (userId) => {
    setSelectedUserId(userId);
    setMessages([]);
    setSharedKey(null);
    if (!userId || !identity) return;
    try {
      await fetch('/api/admin/chat/key', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify({ publicKey: identity.publicKeyJwk }) });
      const response = await fetch(`/api/admin/chat/session/${userId}`, { headers: { 'x-admin-token': adminToken } });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to open conversation.');
      if (!data.userPublicKey) throw new Error('This user has not opened secure chat yet.');
      const key = await deriveChatKey(identity.privateKey, data.userPublicKey);
      setSharedKey(key);
      setMessages(await Promise.all((data.messages || []).map(async (message) => ({ ...message, text: await decryptChatMessage(key, message.ciphertext, message.iv) }))));
      setStatus({ type: 'idle', message: '' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !sharedKey) return;
    try {
      const encrypted = await encryptChatMessage(sharedKey, draft.trim());
      const response = await fetch(`/api/admin/chat/messages/${selectedUserId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify(encrypted) });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to send message.');
      setMessages((previous) => [...previous, { ...data.message, text: draft.trim() }]);
      setDraft('');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  useEffect(() => {
    if (!selectedUserId || !identity) return undefined;
    const refreshTimer = window.setInterval(() => openConversation(selectedUserId), 5000);
    return () => window.clearInterval(refreshTimer);
  }, [selectedUserId, identity]);

  return <div className="admin-section-panel admin-chat-panel"><div className="admin-section-header"><div><p className="eyebrow">Private communications</p><h2>Secure user chat</h2><p>Messages are encrypted in the browser. The server stores ciphertext only.</p></div></div><div className="admin-chat-layout"><div className="admin-chat-users"><label>Choose user<select value={selectedUserId} onChange={(event) => openConversation(event.target.value)}><option value="">Select a user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>{users.map((user) => <button type="button" key={user.id} className={String(user.id) === String(selectedUserId) ? 'admin-chat-user active' : 'admin-chat-user'} onClick={() => openConversation(String(user.id))}>{user.name}<small>{user.email}</small></button>)}</div><div className="admin-chat-conversation"><div className="chat-message-list">{messages.length ? messages.map((message) => <div key={message.id} className={`chat-message ${message.sender === 'admin' ? 'outgoing' : 'incoming'}`}><span>{message.text}</span><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>) : <p>{selectedUserId ? 'No messages in this conversation yet.' : 'Select a user to begin.'}</p>}</div><form className="chat-compose" onSubmit={sendMessage}><textarea rows="2" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a secure reply..." disabled={!sharedKey} /><button type="submit" className="primary-btn small" disabled={!sharedKey || !draft.trim()}>Send</button></form>{status.message && <p className={`form-feedback ${status.type}`}>{status.message}</p>}</div></div></div>;
}
