import { useEffect, useState } from 'react';
import GigCard from './components/GigCard';
import Navbar from './components/Navbar';
import AdminDashboard from './admin/AdminDashboard';
import { decryptChatMessage, deriveChatKey, encryptChatMessage, getChatIdentity } from './utils/chatCrypto';

const socialLinks = [
  {
    name: 'Facebook',
    url: 'https://facebook.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H8v3h3v7h3v-7h2.5l.5-3H14V8z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    url: 'https://instagram.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'X',
    url: 'https://x.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 4 16 16" />
        <path d="M20 4 4 20" />
      </svg>
    ),
  },
];

const nigeriaLocations = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
  'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
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

function readSavedUser() {
  try {
    const saved = window.localStorage.getItem('pawapixUser');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    window.localStorage.removeItem('pawapixUser');
    window.localStorage.removeItem('pawapixUserToken');
    return null;
  }
}

function readSavedLoginIdentifier() {
  return window.localStorage.getItem('pawapixLoginIdentifier') || '';
}

function getStatusClass(status) {
  const normalizedStatus = String(status || '').toLowerCase();
  if (['accepted', 'approved', 'successful', 'completed', 'success'].includes(normalizedStatus)) return 'status-success';
  if (['failed', 'rejected', 'declined', 'pending'].includes(normalizedStatus)) return 'status-error';
  return 'status-neutral';
}

function formatStatus(status) {
  return String(status || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isImageFile(file) {
  return String(file?.fileType || '').toLowerCase().startsWith('image/');
}

function App() {
  const [gigs, setGigs] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [plans, setPlans] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ socialLinks: {} });
  const [legalModal, setLegalModal] = useState(null);
  const [supportContactsOpen, setSupportContactsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState({ type: 'idle', message: '' });
  const [chatIdentity, setChatIdentity] = useState(null);
  const [chatKey, setChatKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creativeDirectory, setCreativeDirectory] = useState([]);
  const [creativeSearch, setCreativeSearch] = useState('');
  const [creativeSort, setCreativeSort] = useState('rating');
  const [directoryStatus, setDirectoryStatus] = useState({ type: 'idle', message: '' });
  const [contractCreative, setContractCreative] = useState(null);
  const [selectedCreative, setSelectedCreative] = useState(null);
  const [contractForm, setContractForm] = useState({ projectType: '', message: '' });
  const [ratingForm, setRatingForm] = useState({});
  const [statCounts, setStatCounts] = useState({ projects: 0, satisfaction: 0, support: 0 });
  const [projectForm, setProjectForm] = useState({ name: '', email: '', projectType: 'Branding', message: '' });
  const [projectPostForm, setProjectPostForm] = useState({ title: '', description: '', projectCount: 1, budget: '', media: null });
  const [projectPostStatus, setProjectPostStatus] = useState({ type: 'idle', message: '' });
  const [creativeForm, setCreativeForm] = useState({ name: '', email: '', specialty: 'Brand Design', message: '' });
  const [projectStatus, setProjectStatus] = useState({ type: 'idle', message: '' });
  const [creativeStatus, setCreativeStatus] = useState({ type: 'idle', message: '' });
  const [supportForm, setSupportForm] = useState({ name: '', email: '', message: '' });
  const [supportStatus, setSupportStatus] = useState({ type: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState({ project: false, creative: false, auth: false, withdraw: false, deposit: false, upload: false });
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return ['/admin', '/pawa-admin-2026'].includes(window.location.pathname) || new URLSearchParams(window.location.search).get('view') === 'admin';
  });
  const [adminToken, setAdminToken] = useState(window.localStorage.getItem('pawapixAdminToken') || '');
  const [authView, setAuthView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resetToken')) return 'reset';
    return params.get('auth') === 'login' ? 'login' : '';
  });
  const [userToken, setUserToken] = useState(window.localStorage.getItem('pawapixUserToken') || '');
  const [user, setUser] = useState(readSavedUser);
  const [authStatus, setAuthStatus] = useState({ type: 'idle', message: '' });
  const [registrationNotice, setRegistrationNotice] = useState({ open: false, seconds: 5 });
  const [forgotNotice, setForgotNotice] = useState({ open: false, email: '', seconds: 0, message: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({ signup: false, login: false, reset: false });
  const [rememberLogin, setRememberLogin] = useState(() => window.localStorage.getItem('pawapixRememberLogin') === 'true');
  const [loginForm, setLoginForm] = useState({ email: readSavedLoginIdentifier(), password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', username: '', password: '', role: 'customer', specialty: '', location: '' });
  const [userDashboard, setUserDashboard] = useState({ balance: 0, withdrawals: [], deposits: [], works: [], applications: [], projects: [], notifications: [], activeProjects: 0, pendingProjects: 0, completedProjects: 0, uploads: 0 });
  const [paymentOptions, setPaymentOptions] = useState({ enabled: true, methods: [], currencies: [], minimumPayment: 0 });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dashboardPanel, setDashboardPanel] = useState('overview');
  const [expandedNotifications, setExpandedNotifications] = useState({});
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', profilePic: null });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'bank', bankName: '', accountName: '', accountNumber: '' });
  const [payoutDetailsOpen, setPayoutDetailsOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: '', method: 'stripe' });
  const [selectedDepositPlan, setSelectedDepositPlan] = useState(null);
  const [withdrawStatus, setWithdrawStatus] = useState({ type: 'idle', message: '' });
  const [withdrawalSettings, setWithdrawalSettings] = useState({ minimumAmount: 1, maximumAmount: 1000000, fixedFee: 0, percentageFee: 0, processingTime: '1-3 business days' });
  const [depositStatus, setDepositStatus] = useState({ type: 'idle', message: '' });
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', amount: '', file: null });
  const [uploadStatus, setUploadStatus] = useState({ type: 'idle', message: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ email: '', gateway: '' });
  const [checkoutStatus, setCheckoutStatus] = useState({ type: 'idle', message: '' });
  const [cloudData, setCloudData] = useState({ files: [], sent: [], received: [] });
  const [cloudUpload, setCloudUpload] = useState(null);
  const [cloudTransfer, setCloudTransfer] = useState({ recipientUsername: '', fileIds: [], message: '', agreedAmount: '', projectId: null });
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get('resetToken') || '');
  const [resetPassword, setResetPassword] = useState('');
  const [cloudStatus, setCloudStatus] = useState({ type: 'idle', message: '' });
  const [cloudOpen, setCloudOpen] = useState(false);
  const [findCreativeOpen, setFindCreativeOpen] = useState(false);
  const [postProjectOpen, setPostProjectOpen] = useState(false);
  const [verifiedRecipient, setVerifiedRecipient] = useState(null);
  const [recipientStatus, setRecipientStatus] = useState({ type: 'idle', message: '' });

  const handleAdminLogin = (token) => {
    setAdminToken(token);
    setAdminMode(true);
  };

  const resetAuthForms = () => {
    setForgotEmail('');
    setResetPassword('');
    setForgotNotice({ open: false, email: '', seconds: 0, message: '' });
    setLoginForm((previous) => ({ ...previous, password: '' }));
    setSignupForm({ name: '', email: '', username: '', password: '', role: 'customer', specialty: '', location: '' });
  };

  const handleAuthView = (view) => {
    setAuthStatus({ type: 'idle', message: '' });
    setResetPassword('');
    setForgotEmail('');
    setAuthView(view);
  };

  const handlePlanCheckout = async (event) => {
    event.preventDefault();
    await startPlanCheckout(selectedPlan, checkoutForm.email, checkoutForm.gateway);
  };

  const startPlanCheckout = async (plan, email = '', gateway = '') => {
    if (!plan) return;
    if (user?.id) {
      setActivePlan(plan);
      window.localStorage.setItem(`pawapixActivePlan-${user.id}`, JSON.stringify(plan));
    }
    setCheckoutStatus({ type: 'idle', message: '' });
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, customerEmail: email || user?.email || '', gateway: gateway || plan.paymentGateway || paymentOptions.gateway || '' })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to prepare payment.');
      if (!data.checkout.redirectUrl) throw new Error('The selected payment gateway is not configured for checkout.');
      window.location.assign(data.checkout.redirectUrl);
    } catch (error) {
      setSelectedPlan(plan);
      setCheckoutForm({ email: email || user?.email || '', gateway: gateway || plan.paymentGateway || paymentOptions.gateway || '' });
      setCheckoutStatus({ type: 'error', message: error.message });
    }
  };

  const openServiceCheckout = (service) => {
    setSelectedService(service);
    setSelectedPlan(null);
    setCheckoutForm({ email: user?.email || '', gateway: service?.paymentGateway || paymentOptions.gateway || '' });
    setCheckoutStatus({ type: 'idle', message: '' });
  };

  const handleAdminAccessFromLogin = async (event) => {
    event.preventDefault();
    setIsSubmitting((prev) => ({ ...prev, auth: true }));
    setAuthStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Admin login failed.');

      window.localStorage.setItem('pawapixAdminToken', data.token);
      setAdminToken(data.token);
      setAdminMode(true);
      setAuthView('');
      setAuthStatus({ type: 'success', message: 'Admin access granted.' });
    } catch (error) {
      setAuthStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, auth: false }));
    }
  };

  const closeAuthModal = () => {
    setAuthStatus({ type: 'idle', message: '' });
    setAuthView('');
    resetAuthForms();
  };

  const fetchUserDashboard = async (token = userToken) => {
    if (!token) {
      setUserDashboard({ balance: 0, withdrawals: [], deposits: [], works: [], applications: [], projects: [], notifications: [], activeProjects: 0, pendingProjects: 0, completedProjects: 0, uploads: 0 });
      return;
    }

    try {
      const response = await fetch('/api/user/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await readJsonResponse(response);
      if (response.status === 401 || response.status === 404) {
        handleUserLogout();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to load dashboard.');
      if (data.user && JSON.stringify(data.user) !== JSON.stringify(user)) {
        setUser(data.user);
        window.localStorage.setItem('pawapixUser', JSON.stringify(data.user));
      }
      setUserDashboard({
        balance: Number(data.balance || 0),
        withdrawals: data.withdrawals || [],
        deposits: data.deposits || [],
        works: data.works || [],
        applications: data.applications || [],
        projects: data.projects || [],
        creativeApplications: data.creativeApplications || [],
        availableProjects: data.availableProjects || [],
        notifications: data.notifications || [],
        activeProjects: Number(data.activeProjects || 0),
        pendingProjects: Number(data.pendingProjects || 0),
        completedProjects: Number(data.completedProjects || 0),
        uploads: Number(data.uploads || 0)
      });
      setWithdrawalSettings(data.withdrawalSettings || withdrawalSettings);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUserLogout = () => {
    setUserToken('');
    setUser(null);
    setUserDashboard({ balance: 0, withdrawals: [], deposits: [], works: [], applications: [], projects: [], notifications: [], activeProjects: 0, pendingProjects: 0, completedProjects: 0, uploads: 0 });
    setProfileMenuOpen(false);
    setProfileEditMode(false);
    window.localStorage.removeItem('pawapixUserToken');
    window.localStorage.removeItem('pawapixUser');
    setAuthStatus({ type: 'success', message: 'Logged out successfully' });
    setAuthView('');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    const paymentSucceeded = params.get('payment') === 'success' || params.get('status') === 'success';
    if ((!paymentSucceeded && !reference) || !reference || !userToken || !user) return;
    setDashboardPanel('overview');
    setProfileMenuOpen(false);
    fetch(`/api/user/deposit/verify?reference=${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${userToken}` } })
      .then(readJsonResponse)
      .then(async (data) => {
        if (!data.success) throw new Error(data.error || 'Payment could not be verified.');
        setDepositStatus({ type: 'success', message: `Payment verified. NGN ${Number(data.deposit.amount || 0).toLocaleString()} was added to your balance.` });
        await fetchUserDashboard(userToken);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch((error) => setDepositStatus({ type: 'error', message: error.message }))
      .finally(() => window.history.replaceState({}, '', window.location.pathname));
  }, [user?.id, userToken]);

  const fetchCloudData = async (token = userToken) => {
    if (!token) return setCloudData({ files: [], sent: [], received: [] });
    const response = await fetch('/api/user/cloud', { headers: { Authorization: `Bearer ${token}` } });
    const data = await readJsonResponse(response);
    if (response.ok) setCloudData(data);
  };

  const fetchCreativeDirectory = async (token = userToken) => {
    if (!token || user?.role !== 'customer') return;
    const params = new URLSearchParams({ search: creativeSearch, sort: creativeSort });
    const response = await fetch(`/api/user/creatives?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await readJsonResponse(response);
    if (!response.ok) return setDirectoryStatus({ type: 'error', message: data.error || 'Unable to load creatives.' });
    setCreativeDirectory(data);
  };

  const handleFileDownload = async (fileId, fileName) => {
    const response = await fetch(`/api/user/cloud/files/${fileId}/download`, { headers: { Authorization: `Bearer ${userToken}` } });
    if (!response.ok) return setCloudStatus({ type: 'error', message: 'Unable to download this file.' });
    const transferMatch = cloudData.received.find((transfer) => transfer.files.some((file) => file.id === fileId));
    if (transferMatch && transferMatch.status !== 'flagged') {
      await fetch(`/api/user/cloud/transfers/${transferMatch.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ fileId })
      });
    }
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'download';
    link.click();
    URL.revokeObjectURL(blobUrl);
    await Promise.all([fetchCloudData(userToken), fetchUserDashboard(userToken)]);
  };

  const handleProjectComplaint = async (transferId) => {
    const complaint = window.prompt('Tell the creative what needs to be fixed in this project:');
    if (!complaint || !complaint.trim()) return;
    const response = await fetch(`/api/user/cloud/transfers/${transferId}/complain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ message: complaint.trim() })
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return setCloudStatus({ type: 'error', message: data.error || 'Unable to send the complaint.' });
    setCloudStatus({ type: 'success', message: 'Complaint sent. Funds are now flagged until the creative resolves it.' });
    await Promise.all([fetchCloudData(userToken), fetchUserDashboard(userToken)]);
  };

  const handleProjectComplaintResolution = async (transferId) => {
    const response = await fetch(`/api/user/cloud/transfers/${transferId}/resolve-complaint`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return setCloudStatus({ type: 'error', message: data.error || 'Unable to resolve the complaint.' });
    setCloudStatus({ type: 'success', message: 'Complaint resolved. The project is active again.' });
    await Promise.all([fetchCloudData(userToken), fetchUserDashboard(userToken)]);
  };

  const handleContract = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/user/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ creativeUsername: contractCreative.username, agreedPrice: contractCreative.servicePrice, ...contractForm }) });
    const data = await readJsonResponse(response);
    if (!response.ok) return setDirectoryStatus({ type: 'error', message: data.error || 'Unable to contract creative.' });
    setDirectoryStatus({ type: 'success', message: `Contract sent to @${contractCreative.username}.` });
    setContractCreative(null);
    setContractForm({ projectType: '', message: '' });
    await fetchUserDashboard(userToken);
  };

  const handleRateCreative = async (application) => {
    const rating = ratingForm[application.id];
    const response = await fetch(`/api/user/creatives/${application.creativeId || application.assignedCreativeId}/rating`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ applicationId: application.id, rating: Number(rating) }) });
    const data = await readJsonResponse(response);
    if (!response.ok) return setDirectoryStatus({ type: 'error', message: data.error || 'Unable to save rating.' });
    setDirectoryStatus({ type: 'success', message: 'Your rating was saved.' });
    await fetchUserDashboard(userToken);
  };

  const handleCloudUpload = async (event) => {
    event.preventDefault();
    if (!cloudUpload) return setCloudStatus({ type: 'error', message: 'Choose a file first.' });
    const formData = new FormData();
    formData.append('file', cloudUpload);
    const response = await fetch('/api/user/cloud/files', { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: formData });
    const data = await readJsonResponse(response);
    if (!response.ok) return setCloudStatus({ type: 'error', message: data.error || 'Upload failed.' });
    setCloudUpload(null);
    setCloudStatus({ type: 'success', message: 'File uploaded to Work Cloud.' });
    fetchCloudData(userToken);
  };

  const handleCloudTransfer = async (event) => {
    event.preventDefault();
    if (!verifiedRecipient) {
      setCloudStatus({ type: 'error', message: 'Verify the recipient username before sending.' });
      return;
    }
    const response = await fetch('/api/user/cloud/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify(cloudTransfer) });
    const data = await readJsonResponse(response);
    if (!response.ok) return setCloudStatus({ type: 'error', message: data.error || 'Unable to send files.' });
    setCloudTransfer({ recipientUsername: '', fileIds: [], message: '', agreedAmount: '', projectId: null });
    setVerifiedRecipient(null);
    setCloudStatus({ type: 'success', message: 'Work sent successfully.' });
    fetchCloudData(userToken);
  };

  const handleCompleteTransfer = async (transferId) => {
    const response = await fetch(`/api/user/cloud/transfers/${transferId}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${userToken}` } });
    const data = await readJsonResponse(response);
    if (!response.ok) return setCloudStatus({ type: 'error', message: data.error || 'Unable to complete project.' });
    setCloudStatus({ type: 'success', message: 'Project completed and payment transferred.' });
    await Promise.all([fetchCloudData(userToken), fetchUserDashboard(userToken)]);
  };

  const handleForgotPassword = () => {
    if (forgotNotice.seconds > 0) return;
    setForgotEmail(loginForm.email.includes('@') ? loginForm.email : '');
    setAuthStatus({ type: 'idle', message: '' });
    setAuthView('forgot');
  };

  const submitForgotPassword = async (event) => {
    event.preventDefault();
    if (forgotNotice.seconds > 0 || !forgotEmail.trim()) return;
    const email = forgotEmail.trim().toLowerCase();
    const response = await fetch('/api/password/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await readJsonResponse(response);
    if (response.ok) {
      setForgotNotice({ open: false, email, seconds: 50, message: 'A password reset email has been sent to your email account.' });
    } else {
      setAuthStatus({ type: 'error', message: data.error || 'Unable to request password reset.' });
    }
  };

  useEffect(() => {
    if (user?.id) {
      try {
        const savedPlan = window.localStorage.getItem(`pawapixActivePlan-${user.id}`);
        setActivePlan(savedPlan ? JSON.parse(savedPlan) : null);
      } catch (error) {
        setActivePlan(null);
      }
    } else {
      setActivePlan(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (forgotNotice.seconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setForgotNotice((previous) => ({ ...previous, seconds: Math.max(0, previous.seconds - 1) }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [forgotNotice.seconds]);

  useEffect(() => {
    if (!registrationNotice.open) return undefined;
    const timer = window.setInterval(() => {
      setRegistrationNotice((previous) => ({ ...previous, seconds: previous.seconds - 1 }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [registrationNotice.open]);

  useEffect(() => {
    if (!registrationNotice.open || registrationNotice.seconds > 0) return;
    setRegistrationNotice({ open: false, seconds: 5 });
    setAuthView('login');
  }, [registrationNotice.open, registrationNotice.seconds]);

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, password: resetPassword }) });
    const data = await readJsonResponse(response);
    setAuthStatus({ type: response.ok ? 'success' : 'error', message: data.message || data.error || 'Unable to reset password.' });
    if (response.ok) setResetPassword('');
  };

  const verifyRecipient = async () => {
    const username = cloudTransfer.recipientUsername.trim().replace(/^@+/, '');
    setVerifiedRecipient(null);
    if (!username) return setRecipientStatus({ type: 'error', message: 'Enter a username to verify.' });
    const response = await fetch(`/api/user/search?username=${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${userToken}` } });
    const data = await readJsonResponse(response);
    const match = Array.isArray(data) ? data.find((candidate) => candidate.username?.replace(/^@+/, '').toLowerCase() === username.toLowerCase()) : null;
    if (!response.ok || !match) return setRecipientStatus({ type: 'error', message: 'Username not found. Check the handle and try again.' });
    setCloudTransfer((prev) => ({ ...prev, recipientUsername: match.username }));
    setVerifiedRecipient(match);
    setRecipientStatus({ type: 'success', message: `Recipient verified: ${match.name} (${match.role}).` });
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    if (!userToken) return;
    const formData = new FormData();
    if (profileForm.name) formData.append('name', profileForm.name);
    if (profileForm.username) formData.append('username', profileForm.username);
    if (user?.role === 'creative') {
      formData.append('specialty', profileForm.specialty || '');
      formData.append('location', profileForm.location || 'Remote');
      formData.append('servicePrice', profileForm.servicePrice || '0');
      formData.append('bankName', profileForm.bankName || '');
      formData.append('accountName', profileForm.accountName || '');
      formData.append('accountNumber', profileForm.accountNumber || '');
    }
    if (profileForm.profilePic) formData.append('profilePic', profileForm.profilePic);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
        body: formData
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to update profile.');
      setUser(data.user);
      window.localStorage.setItem('pawapixUser', JSON.stringify(data.user));
      setProfileEditMode(false);
      setProfileMenuOpen(false);
      await fetchUserDashboard(userToken);
      setAuthStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setAuthStatus({ type: 'error', message: error.message });
    }
  };

  useEffect(() => {
    const refreshSiteSettings = async () => {
      try {
        const response = await fetch('/api/site-settings', { cache: 'no-store' });
        const data = await readJsonResponse(response);
        if (response.ok) setSiteSettings(data);
      } catch (error) {
        console.error(error);
      }
    };

    refreshSiteSettings();
    const refreshTimer = window.setInterval(refreshSiteSettings, 5000);
    const handleSettingsUpdated = () => refreshSiteSettings();
    window.addEventListener('pawapix-site-settings-updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);

    if (user) {
      setProfileForm((prev) => ({ ...prev, username: user.username || '', name: user.name || '', specialty: user.specialty || '', location: user.location || 'Remote', servicePrice: user.servicePrice || '', bankName: user.payoutDetails?.bankName || '', accountName: user.payoutDetails?.accountName || '', accountNumber: user.payoutDetails?.accountNumber || '', profilePic: null }));
    }

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('pawapix-site-settings-updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, [user]);

  const handleDepositRequest = async (event) => {
    event.preventDefault();
    if (!selectedDepositPlan) {
      setDepositStatus({ type: 'error', message: 'Choose a plan before continuing to payment.' });
      return;
    }
    setIsSubmitting((prev) => ({ ...prev, deposit: true }));
    setDepositStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedDepositPlan.id,
          customerEmail: user?.email || '',
          gateway: depositForm.method,
          returnUrl: `${window.location.origin}/?payment=success&planId=${selectedDepositPlan.id}`
        })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to prepare payment.');
      if (!data.checkout?.redirectUrl) throw new Error('The selected payment gateway is not configured for checkout.');
      window.location.assign(data.checkout.redirectUrl);
    } catch (error) {
      setDepositStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, deposit: false }));
    }
  };

  const openDepositPlans = () => {
    setDashboardPanel('overview');
    setProfileMenuOpen(false);
    window.setTimeout(() => document.getElementById('dashboard-plans-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const selectDepositPlan = (plan) => {
    setSelectedDepositPlan(plan);
    setDepositForm((previous) => ({ ...previous, amount: String(Number(plan.price || 0)) }));
    setDashboardPanel('funds');
    window.setTimeout(() => document.getElementById('deposit-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const handleWithdrawRequest = async (event) => {
    event.preventDefault();
    setIsSubmitting((prev) => ({ ...prev, withdraw: true }));
    setWithdrawStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ ...withdrawForm, amount: Number(withdrawForm.amount) })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Withdrawal request failed.');
      setWithdrawStatus({ type: 'success', message: data.message || 'Withdrawal request submitted.' });
      setWithdrawForm((previous) => ({ ...previous, amount: '', bankName: user?.payoutDetails?.bankName || '', accountName: user?.payoutDetails?.accountName || '', accountNumber: user?.payoutDetails?.accountNumber || '' }));
      await fetchUserDashboard(userToken);
    } catch (error) {
      setWithdrawStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, withdraw: false }));
    }
  };

  const handleWorkUpload = async (event) => {
    event.preventDefault();
    if (!uploadForm.file) {
      setUploadStatus({ type: 'error', message: 'Choose a file to upload.' });
      return;
    }

    setIsSubmitting((prev) => ({ ...prev, upload: true }));
    setUploadStatus({ type: 'idle', message: '' });

    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('amount', uploadForm.amount);
      formData.append('file', uploadForm.file);

      const response = await fetch('/api/user/works', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: formData
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      setUploadStatus({ type: 'success', message: 'Successful: Portfolio uploaded and approved.' });
      setUploadForm({ title: '', description: '', amount: '', file: null });
      await fetchUserDashboard(userToken);
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, upload: false }));
    }
  };

  const handleProjectPost = async (event) => {
    event.preventDefault();
    setProjectPostStatus({ type: 'idle', message: '' });
    const projectCount = Math.max(1, Math.floor(Number(projectPostForm.projectCount || 1)));
    const minimumBudget = projectCount * 800;
    if (Number(projectPostForm.budget || 0) < minimumBudget) {
      setProjectPostStatus({ type: 'error', message: `Total budget must be at least NGN ${minimumBudget.toLocaleString()} for ${projectCount} project${projectCount === 1 ? '' : 's'}.` });
      return;
    }
    if (Number(userDashboard.balance || 0) < Number(projectPostForm.budget || 0)) {
      setProjectPostStatus({ type: 'error', message: `Insufficient balance. Your balance is NGN ${Number(userDashboard.balance || 0).toLocaleString()}, but this project requires NGN ${Number(projectPostForm.budget || 0).toLocaleString()}.` });
      return;
    }
    const formData = new FormData();
    formData.append('title', projectPostForm.title);
    formData.append('description', projectPostForm.description);
    formData.append('projectCount', String(projectCount));
    formData.append('budget', String(projectPostForm.budget));
    if (projectPostForm.media) formData.append('media', projectPostForm.media);
    const response = await fetch('/api/user/projects', { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: formData });
    const data = await readJsonResponse(response);
    if (!response.ok) return setProjectPostStatus({ type: 'error', message: data.error || 'Unable to post project.' });
    setProjectPostForm({ title: '', description: '', projectCount: 1, budget: '', media: null });
    setProjectPostStatus({ type: 'success', message: 'Project posted. Creatives can now apply.' });
    await fetchUserDashboard(userToken);
  };

  const handleProjectApply = async (projectId) => {
    const response = await fetch(`/api/user/projects/${projectId}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ amount: user?.servicePrice || 0 }) });
    const data = await readJsonResponse(response);
    if (!response.ok) return setProjectPostStatus({ type: 'error', message: data.error || 'Unable to apply to project.' });
    setProjectPostStatus({ type: 'success', message: 'Application sent to the project owner.' });
    await fetchUserDashboard(userToken);
  };

  const handleProjectAccept = async (application) => {
    const response = await fetch(`/api/user/projects/${application.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${userToken}` } });
    const data = await readJsonResponse(response);
    if (!response.ok) return setProjectPostStatus({ type: 'error', message: data.error || 'Unable to accept application.' });
    setCloudTransfer((previous) => ({ ...previous, recipientUsername: data.application.creativeUsername, agreedAmount: String(data.application.agreedPrice || 0), message: data.project.title || data.project.projectType, projectId: data.project.id }));
    setVerifiedRecipient({ id: data.application.creativeId, name: application.name, username: data.application.creativeUsername, role: 'creative' });
    setCloudOpen(true);
    setProjectPostStatus({ type: 'success', message: `@${data.application.creativeUsername} accepted. Work Cloud is ready to send the project.` });
    await fetchUserDashboard(userToken);
    window.setTimeout(() => document.querySelector('.work-cloud-section')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    setAdminMode(false);
  };

  const scrollToSection = (id) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSearch = async () => {
    const response = await fetch(`/api/gigs?search=${encodeURIComponent(searchQuery.trim())}`);
    const data = await readJsonResponse(response);
    if (response.ok) {
      setGigs(Array.isArray(data) ? data : []);
      scrollToSection('services');
    }
  };

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting((prev) => ({ ...prev, project: true }));
    setProjectStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) },
        body: JSON.stringify({ ...projectForm, type: 'project', userId: user?.id }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to send project request.');

      setProjectStatus({ type: 'success', message: 'Project request received. We will reach out soon.' });
      setProjectForm({ name: '', email: '', projectType: 'Branding', message: '' });
    } catch (error) {
      setProjectStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, project: false }));
    }
  };

  const handleCreativeSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting((prev) => ({ ...prev, creative: true }));
    setCreativeStatus({ type: 'idle', message: '' });

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creativeForm, projectType: creativeForm.specialty }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to submit creative application.');

      setCreativeStatus({ type: 'success', message: 'Application submitted successfully.' });
      setCreativeForm({ name: '', email: '', specialty: 'Brand Design', message: '' });
    } catch (error) {
      setCreativeStatus({ type: 'error', message: error.message });
    } finally {
      setIsSubmitting((prev) => ({ ...prev, creative: false }));
    }
  };

  const handleSupportSubmit = async (event) => {
    event.preventDefault();
    setSupportStatus({ type: 'idle', message: '' });
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...supportForm, type: 'support' }) });
    const data = await readJsonResponse(response);
    if (!response.ok) return setSupportStatus({ type: 'error', message: data.error || 'Unable to send support request.' });
    setSupportForm({ name: '', email: '', message: '' });
    setSupportStatus({ type: 'success', message: 'Support request submitted successfully.' });
  };

  const loadUserChat = async () => {
    if (!userToken) return;
    try {
      const identity = chatIdentity || await getChatIdentity(`user-${user?.id}`);
      setChatIdentity(identity);
      const keyResponse = await fetch('/api/chat/key', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ publicKey: identity.publicKeyJwk }) });
      const sessionResponse = await fetch('/api/chat/session', { headers: { Authorization: `Bearer ${userToken}` } });
      const session = await readJsonResponse(sessionResponse);
      if (!keyResponse.ok || !sessionResponse.ok) throw new Error(session.error || 'Unable to open secure chat.');
      if (!session.adminPublicKey) throw new Error('Support chat is not available yet.');
      const sharedKey = await deriveChatKey(identity.privateKey, session.adminPublicKey);
      setChatKey(sharedKey);
      const decrypted = await Promise.all((session.messages || []).map(async (message) => ({ ...message, text: await decryptChatMessage(sharedKey, message.ciphertext, message.iv) })));
      setChatMessages(decrypted);
      setChatStatus({ type: 'idle', message: '' });
    } catch (error) {
      setChatStatus({ type: 'error', message: error.message });
    }
  };

  const handleUserChatSend = async (event) => {
    event.preventDefault();
    if (!chatDraft.trim() || !chatKey) return;
    try {
      const encrypted = await encryptChatMessage(chatKey, chatDraft.trim());
      const response = await fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify(encrypted) });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Unable to send secure message.');
      setChatMessages((previous) => [...previous, { ...data.message, text: chatDraft.trim() }]);
      setChatDraft('');
    } catch (error) {
      setChatStatus({ type: 'error', message: error.message });
    }
  };

  useEffect(() => {
    if (!chatOpen || !user) return undefined;
    const refreshTimer = window.setInterval(loadUserChat, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [chatOpen, user?.id, userToken]);

  useEffect(() => {
    fetch('/api/payment-config')
      .then((res) => res.json())
      .then((data) => {
        setPaymentOptions(data);
        setDepositForm((previous) => ({
          ...previous,
          method: data.gateways?.includes(previous.method) ? previous.method : data.gateways?.[0] || ''
        }));
      })
      .catch(console.error);

    fetch('/api/gigs')
      .then((res) => res.json())
      .then(setGigs)
      .catch(console.error);

    fetch('/api/public/creatives')
      .then((res) => res.json())
      .then(setCreatives)
      .catch(console.error);

    fetch('/api/plans')
      .then((res) => res.json())
      .then(setPlans)
      .catch(console.error);

    const targets = { projects: 120, satisfaction: 99, support: 24 };
    const duration = 900;
    const interval = 25;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const progress = Math.min(1, elapsed / duration);

      setStatCounts({
        projects: Math.min(targets.projects, Math.round(targets.projects * progress)),
        satisfaction: Math.min(targets.satisfaction, Math.round(targets.satisfaction * progress)),
        support: Math.min(targets.support, Math.round(targets.support * progress)),
      });

      if (progress === 1) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (['/admin', '/pawa-admin-2026'].includes(path) || new URLSearchParams(window.location.search).get('view') === 'admin') {
      setAdminMode(true);
    }
  }, []);

  useEffect(() => {
    if (userToken && user) {
      fetchUserDashboard(userToken);
      fetchCloudData(userToken);
      if (user.role === 'customer') fetchCreativeDirectory(userToken);
    } else {
      setUserDashboard({ balance: 0, withdrawals: [], deposits: [], works: [], applications: [], projects: [], notifications: [], activeProjects: 0, pendingProjects: 0, completedProjects: 0, uploads: 0 });
    }
  }, [user, userToken]);

  useEffect(() => {
    if (user?.role === 'customer' && userToken) fetchCreativeDirectory(userToken);
  }, [creativeSearch, creativeSort]);

  const isLoggedIn = Boolean(user);

  const handleNavigation = (destination) => {
    if (!isLoggedIn) {
      setAuthView('signup');
      return;
    }
    if (destination === 'plans') {
      if (!activePlan) window.setTimeout(() => document.querySelector('.dashboard-plans-section')?.scrollIntoView({ behavior: 'smooth' }), 0);
      return;
    }
    if (destination === 'services') {
      setAdminMode(false);
      window.location.href = '/#curated-offering';
      return;
    }
    if (!isLoggedIn) {
      setAuthView('signup');
      return;
    }
    setDashboardPanel('overview');
    setProfileEditMode(false);
    setCloudOpen(false);
    if (destination === 'creatives') {
      if (user?.role === 'customer') setFindCreativeOpen(true);
      window.setTimeout(() => document.querySelector('.creative-directory')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
    if (destination === 'apply') {
      window.setTimeout(() => document.querySelector('.open-projects-section')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  };

  const handleProfileDropdownToggle = () => {
    setProfileMenuOpen((prev) => !prev);
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const renderUserDashboard = () => (
    <section className="section dashboard-shell" data-panel={dashboardPanel}>
      <div className="dashboard-topbar">
        <div className="dashboard-nav-label">
          <span className="eyebrow">{user?.role === 'creative' ? 'Creative studio' : 'Client workspace'}</span>
          <strong>{user?.role === 'creative' ? 'Provider dashboard' : 'User dashboard'}</strong>
        </div>
        <div className="dashboard-topbar-actions">
          <button type="button" className="dashboard-home-btn" onClick={handleGoHome} aria-label="Go to home page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
          </button>
          <button type="button" className="dashboard-profile-toggle" onClick={handleProfileDropdownToggle}>
          {user?.profilePicUrl ? (
            <img
              src={user.profilePicUrl}
              alt={user.name || 'Profile'}
              className="dashboard-avatar"
            />
          ) : (
            <div className="dashboard-avatar dashboard-avatar-placeholder">
              {user?.name?.charAt(0).toUpperCase() || 'P'}
            </div>
          )}
            <div className="dashboard-profile-copy">
              <span>{user?.name || 'Welcome'}</span>
              <small>{user?.email}</small>
            </div>
            <span className={`dashboard-arrow ${profileMenuOpen ? 'open' : ''}`}>▾</span>
          </button>
        </div>
        {profileMenuOpen && (
          <div className="dashboard-profile-menu">
            <button type="button" onClick={() => { setProfileEditMode(true); setDashboardPanel('profile'); setProfileMenuOpen(false); }}>
              Profile
            </button>
            <button type="button" onClick={() => { if (user?.role === 'creative') { setWithdrawOpen(true); setDashboardPanel('funds'); setProfileMenuOpen(false); } else { openDepositPlans(); } }}>
              {user?.role === 'creative' ? 'Withdraw funds' : 'Deposit funds'}
            </button>
            <button type="button" onClick={() => { setCloudOpen(true); setDashboardPanel('cloud'); setProfileMenuOpen(false); }}>Work Cloud</button>
            <button type="button" onClick={handleUserLogout}>
              Sign out
            </button>
          </div>
        )}
      </div>

        {dashboardPanel === 'overview' && <div className="dashboard-welcome-card">
        <div>
          <p className="eyebrow">Member dashboard</p>
          <h1>Welcome Back, {user?.name}</h1>
        </div>
        </div>}

        {cloudOpen && dashboardPanel === 'cloud' && <section className="dashboard-section work-cloud-section">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Private file transfer</p><h2>Work Cloud</h2></div><div className="dashboard-inline-actions"><span>{cloudData.files.length} file(s)</span><button type="button" className="secondary small" onClick={() => { setCloudOpen(false); setDashboardPanel('overview'); }}>Close</button></div></div>
        <div className="cloud-actions">
          <form className="dashboard-form cloud-upload-form" onSubmit={handleCloudUpload}><label>Upload file<input type="file" onChange={(event) => setCloudUpload(event.target.files?.[0] || null)} required /></label><button type="submit" className="primary-btn">Upload to cloud</button></form>
          <form className="dashboard-form cloud-send-form" onSubmit={handleCloudTransfer}><label>Recipient username<div className="recipient-input-row"><input value={cloudTransfer.recipientUsername} onBlur={verifyRecipient} onChange={(event) => { setVerifiedRecipient(null); setRecipientStatus({ type: 'idle', message: '' }); setCloudTransfer((prev) => ({ ...prev, recipientUsername: event.target.value })); }} placeholder="username" required /><button type="button" className="secondary" onClick={verifyRecipient}>Verify</button></div></label>{recipientStatus.message && <p className={`form-feedback ${recipientStatus.type}`}>{recipientStatus.message}</p>}{verifiedRecipient && <div className="verified-recipient"><strong>{verifiedRecipient.name}</strong><span>@{verifiedRecipient.username} · {verifiedRecipient.role}</span></div>}<label>Agreed amount (NGN)<input type="number" min="0" value={cloudTransfer.agreedAmount} onChange={(event) => setCloudTransfer((prev) => ({ ...prev, agreedAmount: event.target.value }))} required={user?.role !== 'creative'} /></label>{user?.role === 'customer' && Number(userDashboard.balance || 0) < Number(cloudTransfer.agreedAmount || 0) && <p className="form-feedback error">Insufficient balance to send this project.</p>}<label>Files to send<select multiple value={cloudTransfer.fileIds.map(String)} onChange={(event) => setCloudTransfer((prev) => ({ ...prev, fileIds: Array.from(event.target.selectedOptions, (option) => option.value) }))} required>{cloudData.files.map((file) => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label><label>Message<textarea rows="2" value={cloudTransfer.message} onChange={(event) => setCloudTransfer((prev) => ({ ...prev, message: event.target.value }))} placeholder="Final project files" /></label><button type="submit" className="primary-btn" disabled={!verifiedRecipient || user?.role === 'customer' && Number(userDashboard.balance || 0) < Number(cloudTransfer.agreedAmount || 0)}>Send work</button></form>
        </div>
        {cloudStatus.message && <p className={`form-feedback ${cloudStatus.type}`}>{cloudStatus.message}</p>}
        <div className="cloud-transfer-grid"><div><h3>Received</h3>{cloudData.received.length === 0 ? <p>No received work yet.</p> : cloudData.received.map((transfer) => <article key={transfer.id}><strong>{transfer.fileNames.join(', ')}</strong><small>{transfer.message || 'No message'} · {new Date(transfer.createdAt).toLocaleDateString()}{user?.role === 'customer' ? ` · Agreed: NGN ${Number(transfer.agreedAmount || 0).toLocaleString()}` : ''} · <span className={getStatusClass(transfer.status)}>{formatStatus(transfer.status)}</span>{transfer.customerComplaint ? ` · Complaint: ${transfer.customerComplaint}` : ''}</small>{transfer.files.filter(isImageFile).map((file) => <img key={`preview-${file.id}`} src={file.fileUrl} alt={file.fileName} className="cloud-image-preview" />)}<div className="dashboard-inline-actions">{transfer.files.map((file) => <button type="button" className="secondary small" key={file.id} onClick={() => handleFileDownload(file.id, file.fileName)}>Preview / Download {file.fileName}</button>)}{user?.role === 'customer' && transfer.status !== 'completed' && transfer.status !== 'flagged' && <button type="button" className="primary-btn small" onClick={() => handleCompleteTransfer(transfer.id)}>Project completed</button>}{user?.role === 'customer' && transfer.status !== 'flagged' && <button type="button" className="secondary small" onClick={() => handleProjectComplaint(transfer.id)}>Query project</button>}{user?.role === 'creative' && transfer.status === 'flagged' && <button type="button" className="primary-btn small" onClick={() => handleProjectComplaintResolution(transfer.id)}>Resolve complaint</button>}</div></article>)}</div><div><h3>Sent</h3>{cloudData.sent.length === 0 ? <p>No sent work yet.</p> : cloudData.sent.map((transfer) => <article key={transfer.id}><strong>{transfer.fileNames.join(', ')}</strong><small>To @{transfer.recipientUsername} · <span className={getStatusClass(transfer.status)}>{formatStatus(transfer.status)}</span>{user?.role === 'customer' ? ` · Agreed: NGN ${Number(transfer.agreedAmount || 0).toLocaleString()}` : ''}{transfer.customerComplaint ? ` · Complaint: ${transfer.customerComplaint}` : ''}</small></article>)}</div></div>
      </section>}

        {profileEditMode && dashboardPanel === 'profile' && (
        <div className="profile-edit-panel">
          <div className="profile-panel-heading"><div><p className="eyebrow">Account profile</p><h2>Your information</h2></div><button type="button" className="secondary small" onClick={() => { setProfileEditMode(false); setDashboardPanel('overview'); }}>Close</button></div>
          <dl className="profile-details">
            <div><dt>Full name</dt><dd>{user?.name || '—'}</dd></div>
            <div><dt>Email</dt><dd>{user?.email || '—'}</dd></div>
            <div><dt>Username</dt><dd>{user?.username || '—'}</dd></div>
            <div><dt>Account type</dt><dd>{user?.role === 'creative' ? 'Creative / service provider' : 'Client'}</dd></div>
            {user?.role === 'creative' && <><div><dt>Specialty</dt><dd>{user?.specialty || 'Creative services'}</dd></div><div><dt>Starting price</dt><dd>NGN {Number(user?.servicePrice || 0).toLocaleString()}</dd></div></>}
          </dl>
          <p className="profile-protected-note">Email, username, account type, and identity details are protected account fields.</p>
          <h3>Edit profile</h3>
          <form className="dashboard-form" onSubmit={handleProfileSave}>
            <label>
              Username
              <input
                value={profileForm.username || ''}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, username: event.target.value }))}
                required
              />
            </label>
            <label>
              Name
              <input
                value={profileForm.name}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Profile picture
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setProfileForm((prev) => ({ ...prev, profilePic: event.target.files?.[0] || null }))}
              />
            </label>
            {user?.role === 'creative' && <>
              <label>Specialty<input value={profileForm.specialty || ''} onChange={(event) => setProfileForm((prev) => ({ ...prev, specialty: event.target.value }))} placeholder="Brand design, video, illustration" /></label>
              <label>Location<input value={profileForm.location || ''} onChange={(event) => setProfileForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Remote" /></label>
              <label>Starting service price<input type="number" min="0" value={profileForm.servicePrice || ''} onChange={(event) => setProfileForm((prev) => ({ ...prev, servicePrice: event.target.value }))} /></label>
              <label>Bank name<input value={profileForm.bankName || ''} onChange={(event) => setProfileForm((prev) => ({ ...prev, bankName: event.target.value }))} placeholder="Bank name" /></label>
              <label>Account number<input inputMode="numeric" maxLength="10" value={profileForm.accountNumber || ''} onChange={(event) => setProfileForm((prev) => ({ ...prev, accountNumber: event.target.value.replace(/\D/g, '') }))} placeholder="10-digit account number" /></label>
              <label>Account name<input value={profileForm.accountName || ''} onChange={(event) => setProfileForm((prev) => ({ ...prev, accountName: event.target.value }))} placeholder="Account name" /></label>
            </>}
            <div className="dashboard-form-actions">
              <button type="submit" className="primary-btn">Save profile</button>
              <button type="button" className="secondary" onClick={() => { setProfileEditMode(false); setDashboardPanel('overview'); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

        <div className="dashboard-grid">
        <article className="dashboard-card">
          <p className="eyebrow">Current balance</p>
          <strong>NGN {Number(userDashboard.balance || 0).toLocaleString()}</strong>
          <p>{user?.role === 'creative' ? 'Available for withdrawal once your work is approved.' : 'Top up your account to start booking services.'}</p>
        </article>
        <article className="dashboard-card">
          <p className="eyebrow">Active projects</p>
          <strong>{userDashboard.activeProjects || 0}</strong>
          <p>Projects posted and awaiting a creative.</p>
        </article>
        <article className="dashboard-card">
          <p className="eyebrow">Pending projects</p>
          <strong>{userDashboard.pendingProjects || 0}</strong>
          <p>Projects waiting for review or delivery.</p>
        </article>
        <article className="dashboard-card">
          <p className="eyebrow">Completed projects</p>
          <strong>{userDashboard.completedProjects || 0}</strong>
          <p>Projects already finished and approved.</p>
        </article>
        <article className="dashboard-card">
          <p className="eyebrow">Uploads</p>
          <strong>{userDashboard.uploads ?? userDashboard.works.length}</strong>
          <p>Portfolio items shared</p>
        </article>
      </div>

        {user?.role === 'customer' ? <>
        <section id="dashboard-plans-section" className="dashboard-section dashboard-plans-section">
          <div className="dashboard-section-heading"><div><p className="eyebrow">Membership</p><h2>Choose your plan</h2></div></div>
          <div className="dashboard-service-grid">
            {plans.map((plan) => <article key={plan.id} className="dashboard-service-card"><span className="eyebrow">Pawapix plan</span><h3>{plan.name}</h3><strong className="plan-price">{plan.currency || 'NGN'} {Number(plan.price || 0).toLocaleString()}<small> / {plan.interval}</small></strong><p>{plan.features?.join(', ') || 'Flexible creative support.'}</p><button type="button" className="primary-btn plan-cta" onClick={() => selectDepositPlan(plan)}>Choose plan <span aria-hidden="true">→</span></button></article>)}
          </div>
        </section>
        <section className="dashboard-section project-style-section creative-directory">
          <button type="button" className="creative-dropdown-toggle" onClick={() => setFindCreativeOpen((previous) => !previous)} aria-expanded={findCreativeOpen}>
            <span className="creative-directory-title"><span><span className="eyebrow">Creative marketplace</span><strong>Find your next creative partner</strong><small>Browse standout talent ready to bring your brief to life.</small></span></span>
            <span className="creative-directory-toggle-icon" aria-hidden="true">{findCreativeOpen ? '▴' : '▾'}</span>
          </button>
          {findCreativeOpen && <div className="creative-directory-content">
            <div className="dashboard-section-heading marketplace-toolbar"><div><p className="eyebrow">Search by profile</p><h2>Choose a creative to contract</h2></div><label className="marketplace-sort">Sort by<select value={creativeSort} onChange={(event) => setCreativeSort(event.target.value)}><option value="rating">Top ranked</option><option value="price">Lowest price</option></select></label></div>
            <div className="recipient-input-row marketplace-search"><input value={creativeSearch} onChange={(event) => setCreativeSearch(event.target.value)} placeholder="Search by name, username, specialty, or location" /><button type="button" className="secondary" onClick={() => fetchCreativeDirectory(userToken)}>Search</button></div>
            {directoryStatus.message && <p className={`form-feedback ${directoryStatus.type}`}>{directoryStatus.message}</p>}
            <div className="creative-directory-grid">{creativeDirectory.length === 0 ? <p className="empty-project-state">No creatives found yet.</p> : creativeDirectory.map((creative) => <article className="creative-directory-card" key={creative.id}><div className="creative-card-topline"><button type="button" className="profile-avatar-button" onClick={() => setSelectedCreative(creative)} aria-label={`View ${creative.name} portfolio`}>{creative.profilePicUrl ? <img src={creative.profilePicUrl} alt="" /> : creative.name.charAt(0)}</button><span className="creative-rating" aria-label={`${creative.rating || 0} out of 5 stars`}>★ {Number(creative.rating || 0).toFixed(1)}</span></div><button type="button" className="profile-name-button" onClick={() => setSelectedCreative(creative)}>@{creative.username}</button><span className="creative-directory-role">{creative.specialty}</span><span className="creative-location">{creative.location || 'Remote'}</span><button type="button" className="primary-btn" onClick={() => setContractCreative(creative)}>Contract Creative <span aria-hidden="true">→</span></button></article>)}</div>
          </div>}
        </section>
        <section className="dashboard-section open-projects-section project-applications-section">
          <div className="project-section-heading"><div><p className="eyebrow">Projects</p><h2>My applications</h2></div><span className="section-count">{userDashboard.applications.filter((application) => application.type === 'creative-application').length} active</span></div>
          <div className="dashboard-record-list project-record-list">{userDashboard.applications.filter((application) => application.type === 'creative-application').length === 0 ? <p className="empty-project-state">No creative applications yet.</p> : userDashboard.applications.filter((application) => application.type === 'creative-application').map((application) => <article className="project-record-card" key={application.id}><div className="project-record-title"><strong>{application.projectTitle || 'Project application'}</strong><span className={getStatusClass(application.status)}>{formatStatus(application.status || 'applied')}</span></div><small>@{application.creativeUsername} · {application.message || 'No proposal message'} · NGN {Number(application.agreedPrice || 0).toLocaleString()}</small>{application.status === 'applied' && <button type="button" className="primary-btn small" onClick={() => handleProjectAccept(application)}>Accept application</button>}{application.status === 'accepted' && <small>Accepted. Open Work Cloud above to send the project.</small>}{application.status === 'completed' && !userDashboard.ratings?.some((rating) => rating.applicationId === application.id) && <div className="dashboard-inline-actions"><select value={ratingForm[application.id] || ''} onChange={(event) => setRatingForm((prev) => ({ ...prev, [application.id]: event.target.value }))}><option value="">Rate this creative</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select><button type="button" className="secondary small" disabled={!ratingForm[application.id]} onClick={() => handleRateCreative(application)}>Save rating</button></div>}</article>)}</div>
        </section>
        <section className="dashboard-section project-style-section">
          <div className="project-section-heading"><div><p className="eyebrow">Projects</p><h2>My posted projects</h2></div><span className="section-count">{userDashboard.projects.length} total</span></div>
          <div className="dashboard-record-list project-record-list">{userDashboard.projects.length === 0 ? <p className="empty-project-state">No projects posted yet.</p> : userDashboard.projects.map((project) => <article className="project-record-card" key={project.id}>{project.mediaUrl && (String(project.mediaType).startsWith('image/') ? <img src={project.mediaUrl} alt={project.mediaName || project.title} className="work-image-preview" /> : <a href={project.mediaUrl} target="_blank" rel="noreferrer" className="secondary small">Open {project.mediaName || 'project media'}</a>)}<div className="project-record-title"><strong>{project.title || project.projectType}</strong><span className={getStatusClass(project.status)}>{formatStatus(project.status)}</span></div><small>{project.description || project.message} · {project.projectCount || 1} project(s) · Total: NGN {Number(project.budget || 0).toLocaleString()} · Each: NGN {Number(project.amountPerProject || 0).toLocaleString()}{project.mediaName ? ` · Media: ${project.mediaName}` : ''}</small></article>)}</div>
        </section>
        <section className="dashboard-section project-style-section post-project-section">
          <button type="button" className="creative-dropdown-toggle" onClick={() => setPostProjectOpen((previous) => !previous)} aria-expanded={postProjectOpen}>
            <span><span className="eyebrow">Hire directly</span><strong>Post a project</strong><small>Share your brief, media, budget, and project requirements.</small></span>
            <span className="creative-directory-toggle-icon" aria-hidden="true">{postProjectOpen ? '▴' : '▾'}</span>
          </button>
          {postProjectOpen && <form className="dashboard-form" onSubmit={handleProjectPost}><label>Project title<input value={projectPostForm.title} onChange={(event) => setProjectPostForm((previous) => ({ ...previous, title: event.target.value }))} required /></label><label>Project brief<textarea value={projectPostForm.description} onChange={(event) => setProjectPostForm((previous) => ({ ...previous, description: event.target.value }))} required /></label><label>Project media<input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip" onChange={(event) => setProjectPostForm((previous) => ({ ...previous, media: event.target.files?.[0] || null }))} /><small>Optional brief, reference, image, video, audio, or document.</small></label><label>Number of projects<input type="number" min="1" step="1" value={projectPostForm.projectCount} onChange={(event) => setProjectPostForm((previous) => ({ ...previous, projectCount: event.target.value }))} required /></label><label>Total budget (NGN)<input type="number" min={Math.max(800, Math.max(1, Math.floor(Number(projectPostForm.projectCount || 1))) * 800)} value={projectPostForm.budget} onChange={(event) => setProjectPostForm((previous) => ({ ...previous, budget: event.target.value }))} required /></label><p className="dashboard-rule-note">Minimum total budget: NGN {(Math.max(1, Math.floor(Number(projectPostForm.projectCount || 1))) * 800).toLocaleString()} · Amount per project: NGN {projectPostForm.projectCount > 0 ? (Number(projectPostForm.budget || 0) / Number(projectPostForm.projectCount || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</p><button type="submit" className="primary-btn">Post project</button>{projectPostStatus.message && <p className={`form-feedback ${projectPostStatus.type}`}>{projectPostStatus.message}</p>}</form>}
        </section>
      </> : <section className="dashboard-section">
        <p className="eyebrow">Delivery</p><h2>My portfolio and deliveries</h2>
        <form className="dashboard-form" onSubmit={handleWorkUpload}><label>Portfolio title<input value={uploadForm.title} onChange={(event) => setUploadForm((prev) => ({ ...prev, title: event.target.value }))} required /></label><label>Description<input value={uploadForm.description} onChange={(event) => setUploadForm((prev) => ({ ...prev, description: event.target.value }))} /></label><label>Amount to charge (NGN)<input type="number" min="0" value={uploadForm.amount} onChange={(event) => setUploadForm((prev) => ({ ...prev, amount: event.target.value }))} required /></label><label>Portfolio file<input type="file" onChange={(event) => setUploadForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))} required /></label><button type="submit" className="primary-btn" disabled={isSubmitting.upload}>{isSubmitting.upload ? 'Uploading...' : 'Publish portfolio item'}</button>{uploadStatus.message && <p className={`form-feedback ${uploadStatus.type}`}>{uploadStatus.message}</p>}</form>
        <div className="dashboard-record-list project-record-list">{userDashboard.works.length === 0 ? <p className="empty-project-state">No uploaded work yet. Add your first portfolio item below.</p> : userDashboard.works.map((work) => <article className="project-record-card" key={work.id}>{isImageFile(work) && <img src={work.fileUrl} alt={work.title || work.fileName} className="work-image-preview" />}<div className="project-record-title"><strong>{work.title}</strong><span className={getStatusClass(work.status)}>{formatStatus(work.status)}</span></div><small>{work.description || work.fileName} · {work.amount ? `NGN ${Number(work.amount).toLocaleString()}` : 'Price on request'}</small></article>)}</div>
        <div className="project-subsection"><h2>Open projects</h2><div className="dashboard-record-list project-record-list">{userDashboard.availableProjects?.length ? userDashboard.availableProjects.map((project) => { const alreadyApplied = userDashboard.creativeApplications?.some((application) => application.projectId === project.id); return <article className="project-record-card" key={project.id}><div className="project-record-title"><strong>{project.title || project.projectType}</strong><span className="status-error">Open</span></div><small>{project.description || project.message} · {project.projectCount || 1} project(s) · Total: NGN {Number(project.budget || 0).toLocaleString()} · Each: NGN {Number(project.amountPerProject || project.budget || 0).toLocaleString()}</small><button type="button" className={alreadyApplied ? 'applied-btn small' : 'primary-btn small'} disabled={alreadyApplied} onClick={() => handleProjectApply(project.id)}>{alreadyApplied ? 'Applied' : 'Apply to project'}</button></article>; }) : <p className="empty-project-state">No open projects from customers yet.</p>}</div></div>
        <div className="project-subsection"><h2>My project applications</h2><div className="dashboard-record-list project-record-list">{userDashboard.creativeApplications?.length ? userDashboard.creativeApplications.map((application) => <article className="project-record-card" key={application.id}><div className="project-record-title"><strong>{application.projectTitle}</strong><span className={getStatusClass(application.status)}>{formatStatus(application.status)}</span></div><small>NGN {Number(application.agreedPrice || 0).toLocaleString()} · {application.message || 'Application sent'}</small></article>) : <p className="empty-project-state">You have not applied to any projects yet.</p>}</div></div>
      </section>}

      {contractCreative && <div className="auth-modal-backdrop" onClick={() => setContractCreative(null)}><div className="auth-modal-card" onClick={(event) => event.stopPropagation()}><button type="button" className="auth-modal-close" onClick={() => setContractCreative(null)} aria-label="Close contract dialog">×</button><p className="eyebrow">Contract creative</p><h2>{contractCreative.name}</h2><p>@{contractCreative.username} · {contractCreative.specialty}</p><form className="auth-form" onSubmit={handleContract}><label>Project type<input value={contractForm.projectType} onChange={(event) => setContractForm((prev) => ({ ...prev, projectType: event.target.value }))} required /></label><label>Brief<textarea value={contractForm.message} onChange={(event) => setContractForm((prev) => ({ ...prev, message: event.target.value }))} required /></label><button type="submit" className="primary-btn">Send contract request</button></form></div></div>}

        {dashboardPanel === 'funds' && (user?.role !== 'creative' || withdrawOpen) && <section id={user?.role === 'creative' ? 'withdraw-section' : 'deposit-section'} className="dashboard-section">
        <h2>{user?.role === 'creative' ? 'Withdraw funds' : 'Deposit funds'}</h2>
        {user?.role === 'customer' && selectedDepositPlan && <p className="dashboard-rule-note">Selected plan: {selectedDepositPlan.name} · {selectedDepositPlan.currency || 'NGN'} {Number(selectedDepositPlan.price || 0).toLocaleString()} / {selectedDepositPlan.interval}</p>}
        {user?.role === 'creative' && <p className="dashboard-rule-note">Bank transfer only · Minimum withdrawal: NGN 10,000 · Maximum NGN {Number(withdrawalSettings.maximumAmount || 0).toLocaleString()} · Processing {withdrawalSettings.processingTime}</p>}
        <form className="dashboard-form" onSubmit={user?.role === 'creative' ? handleWithdrawRequest : handleDepositRequest}>
          <label>
            Amount
            <input
              type="number"
              min={user?.role === 'creative' ? '10000' : '1'}
              value={user?.role === 'creative' ? withdrawForm.amount : depositForm.amount}
              readOnly={user?.role !== 'creative'}
              onChange={(event) => {
                if (user?.role === 'creative') {
                  setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }));
                } else {
                  setDepositForm((prev) => ({ ...prev, amount: event.target.value }));
                }
              }}
              required
            />
          </label>
          <label>
            Payment gateway
            {user?.role === 'creative' ? <select value="bank transfer" disabled><option value="bank transfer">Bank transfer</option></select> : <select
              value={user?.role === 'creative' ? withdrawForm.method : depositForm.method}
              onChange={(event) => {
                if (user?.role === 'creative') {
                  setWithdrawForm((prev) => ({ ...prev, method: event.target.value }));
                } else {
                  setDepositForm((prev) => ({ ...prev, method: event.target.value }));
                }
              }}
            >
              {(paymentOptions.gateways || []).map((gateway) => <option key={gateway} value={gateway}>{gateway}</option>)}
            </select>}
          </label>
          {user?.role === 'creative' && <div className="payout-details-dropdown">
            <button type="button" className="secondary payout-details-toggle" onClick={() => setPayoutDetailsOpen((previous) => !previous)} aria-expanded={payoutDetailsOpen}>
              {payoutDetailsOpen ? 'Hide bank details' : 'Add bank details'} <span>{payoutDetailsOpen ? '▴' : '▾'}</span>
            </button>
            {payoutDetailsOpen && <div className="payout-details-fields">
              <p className="dashboard-rule-note">Bank details are required before a withdrawal can be submitted.</p>
              <label>Bank name<input value={withdrawForm.bankName} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, bankName: event.target.value }))} required /></label>
              <label>Account number<input inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} value={withdrawForm.accountNumber} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, accountNumber: event.target.value.replace(/\D/g, '') }))} required /></label>
              <label>Account name<input value={withdrawForm.accountName} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, accountName: event.target.value }))} required /></label>
            </div>}
          </div>}
          <button type="submit" className="primary-btn" disabled={user?.role === 'creative' ? isSubmitting.withdraw : isSubmitting.deposit}>
            {user?.role === 'creative' ? (isSubmitting.withdraw ? 'Submitting...' : 'Request withdrawal') : (isSubmitting.deposit ? 'Submitting...' : 'Deposit funds')}
          </button>
          {(user?.role === 'creative' ? withdrawStatus.message : depositStatus.message) && (
            <p className={`form-feedback ${(user?.role === 'creative' ? withdrawStatus.type : depositStatus.type)}`}>
              {user?.role === 'creative' ? withdrawStatus.message : depositStatus.message}
            </p>
          )}
        </form>
      </section>}

  {dashboardPanel === 'funds' && user?.role === 'creative' && <section className="dashboard-section"><p className="eyebrow">Wallet & earnings</p><h2>Withdrawal history</h2><div className="dashboard-record-list">{userDashboard.withdrawals.length === 0 ? <p>No withdrawal requests yet.</p> : userDashboard.withdrawals.map((withdrawal) => <article key={withdrawal.id}><strong>NGN {Number(withdrawal.amount || 0).toLocaleString()}</strong><span>{withdrawal.status}</span><small>Fee NGN {Number(withdrawal.fee || 0).toLocaleString()} · You receive NGN {Number(withdrawal.netAmount ?? withdrawal.amount ?? 0).toLocaleString()} · {new Date(withdrawal.createdAt).toLocaleDateString()}{withdrawal.reason ? ` · ${withdrawal.reason}` : ''}</small></article>)}</div></section>}

        {dashboardPanel === 'overview' && <section className="dashboard-section">
        <h2>Notifications</h2>
        <div className="notifications-list">
          {userDashboard.notifications.length === 0 ? (
            <p>No notifications yet. New updates will appear here.</p>
          ) : (
            userDashboard.notifications.map((notification) => (
              <article key={notification.id} className={`notification-card ${expandedNotifications[notification.id] ? 'expanded' : ''}`} onClick={() => setExpandedNotifications((previous) => ({ ...previous, [notification.id]: !previous[notification.id] }))} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setExpandedNotifications((previous) => ({ ...previous, [notification.id]: !previous[notification.id] })); }}>
                <div><strong>Notification</strong><span aria-hidden="true">{expandedNotifications[notification.id] ? '−' : '+'}</span></div>
                {expandedNotifications[notification.id] && <p>{notification.message}</p>}
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
              </article>
            ))
          )}
        </div>
      </section>}

      {selectedService && <div className="auth-modal-backdrop" onClick={() => setSelectedService(null)}>
        <div className="auth-modal-card checkout-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="auth-modal-close" onClick={() => setSelectedService(null)} aria-label="Close checkout">×</button>
          <p className="eyebrow">Secure checkout</p>
          <h2>{selectedService.title}</h2>
          <p>NGN {Number(selectedService.price || 0).toLocaleString()} service by {selectedService.creative}</p>
          <form className="auth-form" onSubmit={handlePlanCheckout}>
            <label>Email<input type="email" value={checkoutForm.email} onChange={(event) => setCheckoutForm((prev) => ({ ...prev, email: event.target.value }))} required /></label>
            <label>Payment gateway<select value={checkoutForm.gateway} onChange={(event) => setCheckoutForm((prev) => ({ ...prev, gateway: event.target.value }))} required>{(paymentOptions.gateways || []).map((gateway) => <option key={gateway} value={gateway}>{gateway}</option>)}</select></label>
            <label>Payment method<select value={checkoutForm.method} onChange={(event) => setCheckoutForm((prev) => ({ ...prev, method: event.target.value }))} required>{(paymentOptions.methods || []).map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
            <button type="submit" className="primary-btn">Continue to payment</button>
            {checkoutStatus.message && <p className={`form-feedback ${checkoutStatus.type}`}>{checkoutStatus.message}</p>}
          </form>
        </div>
      </div>}
      <button type="button" className={`chat-launcher ${chatOpen ? 'open' : ''}`} onClick={() => { setChatOpen((previous) => !previous); if (!chatOpen) loadUserChat(); }} aria-label="Open secure support chat"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.2 3.1-5 7-5s6.3 1.8 7 5" /><path d="M4 12h-1v5h3" /><path d="M20 12h1v5h-3" /></svg><i aria-hidden="true" /></button>
      {chatOpen && <aside className="chat-panel" aria-label="Secure support chat"><div className="chat-panel-header"><div><p className="eyebrow">Private support</p><h2>Secure chat</h2></div><button type="button" className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat">×</button></div><p className="chat-encryption-note">Messages are encrypted in your browser before they reach the server.</p><div className="chat-message-list">{chatMessages.length ? chatMessages.map((message) => <div key={message.id} className={`chat-message ${message.sender === 'user' ? 'outgoing' : 'incoming'}`}><span>{message.text}</span><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>) : <p>No messages yet. Send a secure message to support.</p>}</div><form className="chat-compose" onSubmit={handleUserChatSend}><textarea rows="2" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message..." disabled={!chatKey} /><button type="submit" className="primary-btn small" disabled={!chatKey || !chatDraft.trim()}>Send</button></form>{chatStatus.message && <p className={`form-feedback ${chatStatus.type}`}>{chatStatus.message}</p>}</aside>}
    </section>
  );

  return (
    <div className="app-shell">
      <Navbar
        onAdminClick={() => {
          window.history.pushState({}, '', '/pawa-admin-2026');
          setAdminMode(true);
        }}
        onUserAuthClick={handleAuthView}
        isLoggedIn={isLoggedIn}
        onLogout={handleUserLogout}
        onNavigate={handleNavigation}
        activePlan={activePlan}
      />

      {selectedCreative && <div className="auth-modal-backdrop" onClick={() => setSelectedCreative(null)}>
        <div className="auth-modal-card portfolio-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="auth-modal-close" onClick={() => setSelectedCreative(null)} aria-label="Close portfolio">×</button>
          <p className="eyebrow">Creative portfolio</p>
          <h2>{selectedCreative.name}</h2>
          <p>@{selectedCreative.username || 'username'} · {selectedCreative.specialty}</p>
          <div className="portfolio-preview">{selectedCreative.portfolio?.length ? selectedCreative.portfolio.map((item) => <article key={item.id}>{isImageFile(item) && <img src={item.fileUrl} alt={item.title || item.fileName} className="portfolio-preview-image" />}<strong>{item.title}</strong><small>{item.description || item.fileName}</small></article>) : <p>No uploaded portfolio yet.</p>}</div>
        </div>
      </div>}

      {forgotNotice.open && <div className="auth-modal-backdrop" onClick={() => setForgotNotice((previous) => ({ ...previous, open: false }))}>
        <div className="auth-modal-card reset-notice" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="auth-modal-close" onClick={() => setForgotNotice((previous) => ({ ...previous, open: false }))} aria-label="Close password reset notice">×</button>
          <p className="eyebrow">Password reset</p>
          <h2>Email sent</h2>
          <p>{forgotNotice.message}</p>
          <p className="dashboard-rule-note">Reset email: {forgotNotice.email}</p>
          <strong>{forgotNotice.seconds > 0 ? `You can request another email in ${forgotNotice.seconds}s.` : 'You can request another reset email now.'}</strong>
          <button type="button" className="primary-btn" onClick={() => setForgotNotice((previous) => ({ ...previous, open: false }))}>Close</button>
        </div>
      </div>}

      {registrationNotice.open && <div className="auth-modal-backdrop registration-notice-backdrop">
        <div className="auth-modal-card registration-notice" role="status" aria-live="polite">
          <div className="registration-check" aria-hidden="true">✓</div>
          <h2>Successfully Registered</h2>
          <p className="form-feedback success">Successfully Registered</p>
          <p>Redirecting you to login in {registrationNotice.seconds} seconds.</p>
        </div>
      </div>}

      {adminMode ? (
        <AdminDashboard
          initialToken={adminToken}
          onClose={() => {
            window.history.pushState({}, '', '/');
            setAdminMode(false);
          }}
          onLoginSuccess={handleAdminLogin}
          onLogout={handleAdminLogout}
        />
      ) : isLoggedIn ? (
        renderUserDashboard()
      ) : (
        <>
          <header className="hero-section">
        <div className="hero-copy-block">
          <p className="eyebrow">Creative Marketplace</p>
          <h1>Hire Top Creatives to launch bold projects with confidence.</h1>
          <p className="hero-copy">
            Discover photographers, illustrators, designers, and motion artists who shape premium brand stories for modern teams.
          </p>

          <div className="hero-actions">
            <div className="search-bar">
              <div className="search-field">
                <input
                  id="home-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search for branding, motion, photography, illustration..."
                />
                <button className="search-button" type="button" onClick={handleSearch}>Search</button>
              </div>
            </div>
            <div className="hero-cta">
              <button className="primary-btn" type="button" onClick={() => handleNavigation('services')}>Browse Services</button>
              <button className="secondary" type="button" onClick={() => handleAuthView('login')}>Login / Sign Up</button>
            </div>
          </div>

          <div className="hero-stat-row">
            <div className="hero-stat-pill">
              <strong>{statCounts.projects}+</strong>
              <span>Premium projects delivered</span>
            </div>
            <div className="hero-stat-pill">
              <strong>{statCounts.satisfaction}%</strong>
              <span>Average client satisfaction</span>
            </div>
            <div className="hero-stat-pill">
              <strong>{statCounts.support}/7</strong>
              <span>Dedicated creative support</span>
            </div>
          </div>
        </div>

        <aside id="curated-offering" className="hero-visual">
          <div className="hero-panel">
            <span className="hero-panel-label">Curated offering</span>
            <h3>Brand systems, motion direction, and campaign assets designed to feel premium.</h3>
            <p>
              This featured workflow combines strategy, visuals, and a fast turnaround for projects that need polish without compromise.
            </p>
            <div className="hero-panel-meta">
              <span>4.9 average rating</span>
              <span>24-hour proposal review</span>
            </div>
          </div>

          <div className="hero-feature-grid">
            <article className="hero-feature">
              <strong>Brand Identity</strong>
              <p>Logo systems and visual guidelines for ambitious brands.</p>
            </article>
            <article className="hero-feature">
              <strong>Motion Story</strong>
              <p>Animated assets and campaign narrative for digital launches.</p>
            </article>
            <article className="hero-feature">
              <strong>Photography</strong>
              <p>Editorial imagery and product visuals for standout storytelling.</p>
            </article>
            <article className="hero-feature">
              <strong>Creative Direction</strong>
              <p>Structured collaboration for every milestone and review.</p>
            </article>
          </div>

          <div className="hero-tag">Trusted by teams that value craft.</div>
        </aside>
      </header>

      {!user && authView && (
        <div className="auth-modal-backdrop" onClick={closeAuthModal}>
          <div className="auth-modal-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="auth-modal-close" onClick={closeAuthModal} aria-label="Close auth dialog">
              ×
            </button>
            <div className="auth-modal-header">
              <p className="eyebrow">Your account</p>
              <h2>{resetToken || authView === 'reset' ? 'Reset your password' : authView === 'forgot' ? 'Forgot password' : authView === 'signup' ? 'Create your account' : 'Login to Pawapix'}</h2>
              <p>
                {resetToken || authView === 'reset'
                  ? 'Choose a new password for your Pawapix account.'
                  : authView === 'forgot'
                  ? 'Enter your account email to receive a password reset link.'
                  : authView === 'signup'
                  ? 'Join Pawapix to hire creatives or apply for paid creative work.'
                  : 'Access your account to track applications and get project updates.'}
              </p>
            </div>

            <div className="auth-modal-content">
              {authView === 'forgot' ? (
                <form className="auth-form" onSubmit={submitForgotPassword}>
                  <label>Email address<input type="email" autoComplete="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required /></label>
                  <button type="submit" className="primary-btn" disabled={forgotNotice.seconds > 0}>{forgotNotice.seconds > 0 ? 'Sent' : 'Send reset email'}</button>
                  {forgotNotice.seconds > 0 && <p className="reset-countdown" role="status">Reset email sent to {forgotNotice.email}. You can request another in {forgotNotice.seconds} seconds.</p>}
                  <button type="button" className="secondary auth-switch-btn" onClick={() => setAuthView('login')}>Back to login</button>
                  {authStatus.message && <p className={`form-feedback ${authStatus.type}`}>{authStatus.message}</p>}
                </form>
              ) : resetToken || authView === 'reset' ? (
                <form className="auth-form" onSubmit={handlePasswordReset}>
                  <label>New password<div className="password-field"><input type={visiblePasswords.reset ? 'text' : 'password'} minLength="6" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} required /><button type="button" className="password-toggle" onClick={() => setVisiblePasswords((previous) => ({ ...previous, reset: !previous.reset }))} aria-label={visiblePasswords.reset ? 'Hide password' : 'Show password'} title={visiblePasswords.reset ? 'Hide password' : 'Show password'}>{visiblePasswords.reset ? '◉' : '◌'}</button></div></label>
                  <button type="submit" className="primary-btn">Reset password</button>
                  {authStatus.message && <p className={`form-feedback ${authStatus.type}`}>{authStatus.message}</p>}
                </form>
              ) : authView === 'signup' ? (
                <form className="auth-form" onSubmit={async (event) => {
                  event.preventDefault();
                  setIsSubmitting((prev) => ({ ...prev, auth: true }));
                  setAuthStatus({ type: 'idle', message: '' });
                  const normalizedSignup = {
                    name: signupForm.name.trim(),
                    email: signupForm.email.trim().toLowerCase(),
                    username: signupForm.username.trim(),
                    password: signupForm.password.trim(),
                    role: signupForm.role,
                    specialty: signupForm.specialty.trim(),
                    location: signupForm.location.trim()
                  };
                  if (normalizedSignup.role === 'creative' && !normalizedSignup.specialty) {
                    setAuthStatus({ type: 'error', message: 'Please enter your specialty.' });
                    setIsSubmitting((prev) => ({ ...prev, auth: false }));
                    return;
                  }
                  try {
                    const response = await fetch('/api/signup', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(normalizedSignup)
                    });
                    const data = await readJsonResponse(response);
                    if (!response.ok) throw new Error('We could not create your account. Please check your details and try again.');
                    setLoginForm({ email: normalizedSignup.username, password: '' });
                    setRegistrationNotice({ open: true, seconds: 5 });
                    setAuthStatus({ type: 'success', message: 'Successfully Registered' });
                    setSignupForm({ name: '', email: '', username: '', password: '', role: 'customer', specialty: '', location: '' });
                  } catch (error) {
                    setAuthStatus({ type: 'error', message: error.message || 'We could not create your account. Please try again.' });
                  } finally {
                    setIsSubmitting((prev) => ({ ...prev, auth: false }));
                  }
                }}>
                  <label>
                    Name
                    <input
                      value={signupForm.name}
                      onChange={(event) => setSignupForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Username
                    <input
                      value={signupForm.username}
                      onChange={(event) => setSignupForm((prev) => ({ ...prev, username: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Password
                    <div className="password-field">
                    <input
                      type={visiblePasswords.signup ? 'text' : 'password'}
                      value={signupForm.password}
                      onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setVisiblePasswords((previous) => ({ ...previous, signup: !previous.signup }))} aria-label={visiblePasswords.signup ? 'Hide password' : 'Show password'} title={visiblePasswords.signup ? 'Hide password' : 'Show password'}>{visiblePasswords.signup ? '◉' : '◌'}</button>
                    </div>
                  </label>
                  <label>
                    Account type
                    <select value={signupForm.role} onChange={(event) => setSignupForm((prev) => ({ ...prev, role: event.target.value }))}>
                      <option value="customer">Customer</option>
                      <option value="creative">Creative</option>
                    </select>
                  </label>
                  {signupForm.role === 'creative' && <label>
                    Specialty
                    <input value={signupForm.specialty} onChange={(event) => setSignupForm((prev) => ({ ...prev, specialty: event.target.value }))} placeholder="Brand design, photography, or motion" required />
                  </label>}
                  <label>
                    Location
                    <select value={signupForm.location} onChange={(event) => setSignupForm((prev) => ({ ...prev, location: event.target.value }))} required>
                      <option value="">Select a state</option>
                      {nigeriaLocations.map((location) => <option key={location} value={location}>{location}</option>)}
                    </select>
                  </label>
                  <div className="auth-form-actions">
                    <button type="submit" className="primary-btn" disabled={isSubmitting.auth}>
                      {isSubmitting.auth ? 'Creating...' : 'Create account'}
                    </button>
                    <button type="button" className="secondary auth-switch-btn" onClick={() => setAuthView('login')}>
                      Login
                    </button>
                  </div>
                  {authStatus.message && <p className={`form-feedback ${authStatus.type}`}>{authStatus.message}</p>}
                </form>
              ) : (
                <form className="auth-form" onSubmit={async (event) => {
                  event.preventDefault();
                  setIsSubmitting((prev) => ({ ...prev, auth: true }));
                  setAuthStatus({ type: 'idle', message: '' });

                  const normalizedLogin = {
                    identifier: loginForm.email.trim(),
                    password: loginForm.password.trim()
                  };
                  const isAdminAttempt = normalizedLogin.identifier.toLowerCase() === 'admin@pawapix.com' || normalizedLogin.identifier.toLowerCase() === 'special-admin@pawapix.com';

                  if (isAdminAttempt) {
                    try {
                      const response = await fetch('/api/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(normalizedLogin)
                      });
                      const data = await readJsonResponse(response);
                      if (!response.ok) throw new Error(data.error || 'Incorrect Login Details');
                      window.localStorage.setItem('pawapixAdminToken', data.token);
                      setAdminToken(data.token);
                      setAdminMode(true);
                      setAuthView('');
                      setAuthStatus({ type: 'success', message: 'Admin access granted.' });
                    } catch (error) {
                      setAuthStatus({ type: 'error', message: error.message });
                    } finally {
                      setIsSubmitting((prev) => ({ ...prev, auth: false }));
                    }
                    return;
                  }

                  try {
                    const response = await fetch('/api/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(normalizedLogin)
                    });
                    const data = await readJsonResponse(response);
                    if (!response.ok) throw new Error(data.error || 'Incorrect Login Details');
                    setUserToken(data.token);
                    setUser(data.user);
                    window.localStorage.setItem('pawapixUserToken', data.token);
                    window.localStorage.setItem('pawapixUser', JSON.stringify(data.user));
                    if (rememberLogin) {
                      window.localStorage.setItem('pawapixLoginIdentifier', normalizedLogin.identifier);
                      window.localStorage.setItem('pawapixRememberLogin', 'true');
                    } else {
                      window.localStorage.removeItem('pawapixLoginIdentifier');
                      window.localStorage.removeItem('pawapixRememberLogin');
                    }
                    setAuthStatus({ type: 'success', message: 'Welcome Back!' });
                    setLoginForm({ email: '', password: '' });
                    setAuthView('');
                    setProfileMenuOpen(false);
                  } catch (error) {
                    setAuthStatus({ type: 'error', message: error.message });
                  } finally {
                    setIsSubmitting((prev) => ({ ...prev, auth: false }));
                  }
                }}>
                  <label>
                    Username or Email
                    <input
                      value={loginForm.email}
                      autoComplete="username"
                      autoFocus
                      onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Password
                    <div className="password-field">
                    <input
                      type={visiblePasswords.login ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setVisiblePasswords((previous) => ({ ...previous, login: !previous.login }))} aria-label={visiblePasswords.login ? 'Hide password' : 'Show password'} title={visiblePasswords.login ? 'Hide password' : 'Show password'}>{visiblePasswords.login ? '◉' : '◌'}</button>
                    </div>
                  </label>
                  <label className="auth-checkbox-row">
                    <input type="checkbox" checked={rememberLogin} onChange={(event) => setRememberLogin(event.target.checked)} />
                    <span>Remember this account on this device</span>
                  </label>
                  <div className="auth-form-actions">
                    <button type="submit" className="primary-btn" disabled={isSubmitting.auth}>
                      {isSubmitting.auth ? 'Signing in...' : 'Sign in'}
                    </button>
                    <button type="button" className="secondary auth-switch-btn" onClick={handleForgotPassword} disabled={forgotNotice.seconds > 0}>
                      {forgotNotice.seconds > 0 ? `Try again in ${forgotNotice.seconds}s` : 'Forgot password'}
                    </button>
                  </div>
                  {authStatus.message && <p className={`form-feedback ${authStatus.type}`}>{authStatus.message}</p>}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="section stats-section">
        <div className="stats-grid">
          <article className="stat-card">
            <span className="stat-value">{statCounts.projects}+</span>
            <p className="stat-copy">Projects Completed with a Premium Creative Delivery</p>
          </article>
          <article className="stat-card">
            <span className="stat-value">{statCounts.satisfaction}%</span>
            <p className="stat-copy">Client Satisfaction Rate Across Creative Campaigns</p>
          </article>
          <article className="stat-card">
            <span className="stat-value">{statCounts.support}/7</span>
            <p className="stat-copy">Support and Creative Guidance from Our Team</p>
          </article>
        </div>
      </section>

      <section id="plans" className="section plans-section">
        <div className="section-header">
          <h2>Choose your plan</h2>
          <p>Select a live plan and continue to secure checkout.</p>
        </div>
        <div className="public-plan-grid">
          {plans.map((plan) => (
            <article key={plan.id} className="public-plan-card">
              <p className="eyebrow">Pawapix plan</p>
              <h3>{plan.name}</h3>
              <strong className="plan-price">{plan.currency || 'NGN'} {Number(plan.price || 0).toLocaleString()}<small> / {plan.interval}</small></strong>
              <div className="plan-features">{(plan.features || []).map((feature) => <span key={feature}>{feature}</span>)}</div>
              <button type="button" className="primary-btn plan-cta" onClick={() => { if (!userToken || !user) { setAuthStatus({ type: 'idle', message: '' }); setAuthView('login'); return; } startPlanCheckout(plan, user.email, plan.paymentGateway || paymentOptions.gateway); }}>Choose plan <span aria-hidden="true">→</span></button>
            </article>
          ))}
        </div>
      </section>

      {(selectedPlan || selectedService) && <div className="auth-modal-backdrop" onClick={() => { setSelectedPlan(null); setSelectedService(null); }}>
        <div className="auth-modal-card checkout-modal" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="auth-modal-close" onClick={() => { setSelectedPlan(null); setSelectedService(null); }} aria-label="Close checkout">×</button>
          <p className="eyebrow">Secure checkout</p>
          <h2>{selectedPlan?.name || selectedService?.title}</h2>
          <p>{selectedPlan ? `${selectedPlan.name} plan` : `${selectedService?.title || 'Service'} by ${selectedService?.creative || 'creative'}`}</p>
          <form className="auth-form" onSubmit={handlePlanCheckout}>
            <label>Email<input type="email" value={checkoutForm.email} onChange={(event) => setCheckoutForm((prev) => ({ ...prev, email: event.target.value }))} required /></label>
            <label>Payment method<select value={checkoutForm.gateway} onChange={(event) => setCheckoutForm((prev) => ({ ...prev, gateway: event.target.value }))} required>{(paymentOptions.gateways || []).map((gateway) => <option key={gateway} value={gateway}>{gateway}</option>)}</select></label>
            <button type="submit" className="primary-btn">Continue to payment</button>
            {checkoutStatus.message && <p className={`form-feedback ${checkoutStatus.type}`}>{checkoutStatus.message}</p>}
          </form>
        </div>
      </div>}

      <section className="section how-it-works-section">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Get started in minutes with a simple process designed for fast creative delivery.</p>
        </div>
        <div className="how-grid">
          <button type="button" className="how-step" onClick={() => { scrollToSection('services'); window.setTimeout(() => document.getElementById('home-search-input')?.focus(), 450); }}>
            <div className="how-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="6" />
                <line x1="14" y1="14" x2="20" y2="20" />
              </svg>
            </div>
            <h3>Search and discover</h3>
            <p>Use the search bar to find illustrators, designers, and photographers that match your vision.</p>
          </button>
          <button type="button" className="how-step" onClick={() => { setAuthStatus({ type: 'idle', message: '' }); setAuthView('login'); }}>
            <div className="how-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <h3>Choose the perfect creative</h3>
            <p>Review portfolios, ratings, and gigs to select the right partner for your project.</p>
          </button>
          <button type="button" className="how-step" onClick={() => { setAuthStatus({ type: 'idle', message: '' }); setAuthView('signup'); }}>
            <div className="how-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 20l5-5 5 5 8-8-5-5-5 5-2-2-6 6v4z" />
              </svg>
            </div>
            <h3>Launch with confidence</h3>
            <p>Collaborate directly and get polished creative outcomes that elevate your brand.</p>
          </button>
        </div>
      </section>

      <section id="creatives" className="section creative-list">
        <div className="section-header">
          <h2>Top Creatives</h2>
          <p>Meet Artists Trusted by Ambitious Brands.</p>
        </div>
        <div className="profile-grid">
          {creatives.map((creative) => {
            const filledStars = Math.round(creative.rating || 0);
            return (
              <article key={creative.id} className="profile-card">
                <button type="button" className="profile-avatar profile-avatar-button" onClick={() => setSelectedCreative(creative)} aria-label={`View ${creative.name} portfolio`}>{creative.profilePicUrl ? <img src={creative.profilePicUrl} alt="" /> : creative.name.charAt(0)}</button>
                <button type="button" className="profile-name-button" onClick={() => setSelectedCreative(creative)}>{creative.name}</button>
                <p>{creative.specialty}</p>
                <div className="rating-row">
                  <div className="rating-stars">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span
                        key={index}
                        className={index < filledStars ? 'star filled' : 'star'}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="rating-value">{creative.rating?.toFixed(1)} / 5</span>
                </div>
                <span>{creative.location}</span>
                <div className="tag-row">
                  {creative.tags.map((tag) => (
                    <small key={tag}>{tag}</small>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section testimonial-section">
        <div className="section-header">
          <h2>Client Testimonials</h2>
          <p>Trusted feedback from brands who launched their creative stories with Pawapix.</p>
        </div>
        <div className="testimonial-grid">
          {(siteSettings.testimonials || []).map((testimonial) => <article key={testimonial.id} className="testimonial-card"><p className="testimonial-quote">“{testimonial.quote}”</p><div className="testimonial-meta"><div className="testimonial-avatar">{testimonial.initials || testimonial.name?.slice(0, 2).toUpperCase()}</div><div><strong>{testimonial.name}</strong><span>{testimonial.role}</span></div></div></article>)}
        </div>
      </section>

      <footer id="apply" className="page-footer">
        <div className="footer-card">
          <div className="footer-intro">
            <p className="footer-title">Ready to launch a standout creative project?</p>
            <p className="footer-copy">Connect with top creatives and get a polished proposal in hours.</p>
          </div>

          <div className="footer-actions">
            <form className="footer-form support-form" onSubmit={handleSupportSubmit}>
              <h3>Support And Inquiries</h3>
              <button type="button" className="support-contacts-toggle" onClick={() => setSupportContactsOpen((previous) => !previous)} aria-expanded={supportContactsOpen}>Support contact information <span aria-hidden="true">{supportContactsOpen ? '▴' : '▾'}</span></button>
              {supportContactsOpen && <div className="support-contact-details"><a href={`mailto:${siteSettings.supportContacts?.email || ''}`}>{siteSettings.supportContacts?.email}</a><a href={`tel:${siteSettings.supportContacts?.phone || ''}`}>{siteSettings.supportContacts?.phone}</a><a href={`https://wa.me/${String(siteSettings.supportContacts?.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp: {siteSettings.supportContacts?.whatsapp}</a></div>}
              <label><span>Name</span><input value={supportForm.name} onChange={(event) => setSupportForm((prev) => ({ ...prev, name: event.target.value }))} required /></label>
              <label><span>Email</span><input type="email" value={supportForm.email} onChange={(event) => setSupportForm((prev) => ({ ...prev, email: event.target.value }))} required /></label>
              <label><span>Message</span><textarea rows="3" value={supportForm.message} onChange={(event) => setSupportForm((prev) => ({ ...prev, message: event.target.value }))} required /></label>
              <button className="footer-submit" type="submit">Send Support Request</button>
              {supportStatus.message && <p className={`form-feedback ${supportStatus.type}`}>{supportStatus.message}</p>}
              <div className="footer-socials">
                {socialLinks.map((social) => (
                  <a key={social.name} href={siteSettings.socialLinks?.[social.name] || social.url} target="_blank" rel="noreferrer" className="social-link" aria-label={social.name}>
                    <span className="social-icon">{social.icon}</span>
                  </a>
                ))}
              </div>
            </form>

            <div className="footer-links">
              <button type="button" onClick={() => setLegalModal('terms')}>Terms of Service</button>
              <button type="button" onClick={() => setLegalModal('privacy')}>Privacy Policy</button>
              <button type="button" onClick={() => setLegalModal('sitemap')}>Sitemap</button>
            </div>
          </div>
        </div>
      </footer>
      <button type="button" className={`chat-launcher ${chatOpen ? 'open' : ''}`} onClick={() => { if (!user) { setAuthView('login'); return; } setChatOpen((previous) => !previous); if (!chatOpen) loadUserChat(); }} aria-label="Open secure support chat"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.2 3.1-5 7-5s6.3 1.8 7 5" /><path d="M4 12h-1v5h3" /><path d="M20 12h1v5h-3" /></svg><i aria-hidden="true" /></button>
      {chatOpen && user && <aside className="chat-panel" aria-label="Secure support chat"><div className="chat-panel-header"><div><p className="eyebrow">Private support</p><h2>Secure chat</h2></div><button type="button" className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close chat">×</button></div><p className="chat-encryption-note">Messages are encrypted in your browser before they reach the server.</p><div className="chat-message-list">{chatMessages.length ? chatMessages.map((message) => <div key={message.id} className={`chat-message ${message.sender === 'user' ? 'outgoing' : 'incoming'}`}><span>{message.text}</span><small>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>) : <p>No messages yet. Send a secure message to support.</p>}</div><form className="chat-compose" onSubmit={handleUserChatSend}><textarea rows="2" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message..." disabled={!chatKey} /><button type="submit" className="primary-btn small" disabled={!chatKey || !chatDraft.trim()}>Send</button></form>{chatStatus.message && <p className={`form-feedback ${chatStatus.type}`}>{chatStatus.message}</p>}</aside>}
      {legalModal && <div className="auth-modal-backdrop" onClick={() => setLegalModal(null)}><div className="legal-modal" onClick={(event) => event.stopPropagation()}><button type="button" className="auth-modal-close" onClick={() => setLegalModal(null)} aria-label="Close legal page">×</button><p className="eyebrow">Pawapix legal</p><h2>{legalModal === 'terms' ? 'Terms of Service' : legalModal === 'privacy' ? 'Privacy Policy' : 'Sitemap'}</h2><div className="legal-content">{(siteSettings.legalPages?.[legalModal] || 'This page is not available yet.').split('\n').map((line, index) => line ? <p key={`${legalModal}-${index}`}>{line}</p> : <br key={`${legalModal}-space-${index}`} />)}</div></div></div>}
        </>
      )}
    </div>
  );
}

export default App;
