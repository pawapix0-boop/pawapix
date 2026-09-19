const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFilePath = path.join(__dirname, 'data-store.json');
const usersBackupPath = path.join(__dirname, 'users-backup.json');
let idSequence = 0;

function createId() {
  idSequence = (idSequence + 1) % 1000;
  return Date.now() * 1000 + idSequence;
}

const seedData = {
  gigs: [
    {
      id: 1,
      title: 'Custom Brand Identity for Creatives',
      creative: 'Maya Rivers',
      price: 1200,
      delivery: '7 days',
      description: 'Design a polished Brand System including Logo, Palette, Typography, and Brand Guidelines for a Creative Business.',
      rating: 4.7,
      tags: ['Branding', 'Identity', 'Logo']
    },
    {
      id: 2,
      title: 'Product Illustration and Packaging Mockups',
      creative: 'Ari Chen',
      price: 950,
      delivery: '10 days',
      description: 'Create expressive Illustrations and Packaging Mockups for your Product Launch or Campaign.',
      rating: 4.3,
      tags: ['Illustration', 'Packaging', 'Mockups']
    },
    {
      id: 3,
      title: 'Editorial Photography Direction',
      creative: 'Sofia Kim',
      price: 1500,
      delivery: '14 days',
      description: 'Full Editorial Photography Story Planning, Styling Guidance, and Direction for Campaigns or Magazines.',
      rating: 4.9,
      tags: ['Photography', 'Editorial', 'Campaign']
    }
  ],
  creatives: [
    {
      id: 1,
      name: 'Maya Rivers',
      specialty: 'Brand Design + Motion',
      location: 'New York, USA',
      hourlyRate: 85,
      rating: 4.8,
      tags: ['Branding', 'Motion', 'Art Direction']
    },
    {
      id: 2,
      name: 'Ari Chen',
      specialty: 'Illustration for Products',
      location: 'London, UK',
      hourlyRate: 70,
      rating: 4.5,
      tags: ['Illustration', 'Packaging', 'Character Design']
    },
    {
      id: 3,
      name: 'Sofia Kim',
      specialty: 'Photography & Editorial',
      location: 'Seoul, KR',
      hourlyRate: 95,
      rating: 4.9,
      tags: ['Photography', 'Editorial', 'Retouching']
    }
  ],
  applications: [],
  contacts: [],
  plans: [
    {
      id: 1,
      name: 'Starter',
      price: 29,
      currency: 'NGN',
      interval: 'month',
      features: ['1 active project', 'Basic support'],
      paymentGateway: 'stripe'
    },
    {
      id: 2,
      name: 'Growth',
      price: 89,
      currency: 'NGN',
      interval: 'month',
      features: ['Unlimited projects', 'Priority support'],
      paymentGateway: 'stripe'
    },
    {
      id: 3,
      name: 'Studio',
      price: 199,
      currency: 'NGN',
      interval: 'month',
      features: ['Team seats', 'Dedicated manager'],
      paymentGateway: 'paypal'
    }
  ],
  paymentConfig: {
    gateway: 'stripe',
    enabled: true,
    publicKey: 'pk_test_demo',
    webhookSecret: 'whsec_demo',
    gateways: ['stripe', 'paypal'],
    methods: ['Card', 'Bank transfer', 'PayPal'],
    currencies: ['NGN'],
    commissionRate: 10,
    taxRate: 0,
    minimumPayment: 1,
    automaticConfirmation: true
  },
  withdrawalSettings: {
    enabled: true,
    creativesEnabled: true,
    customersEnabled: false,
    minimumAmount: 10000,
    maximumAmount: 1000000,
    fixedFee: 0,
    percentageFee: 0,
    processingTime: '1-3 business days',
    currency: 'NGN',
    methods: ['bank transfer']
  },
  siteSettings: {
    socialLinks: {
      Facebook: 'https://facebook.com',
      Instagram: 'https://instagram.com',
      X: 'https://x.com'
    },
    testimonials: [
      { id: 'testimonial-1', quote: 'The creative team turned our brand vision into an immersive campaign faster than expected. Every touchpoint felt premium and on message.', name: 'Maya Hart', role: 'Brand Director', initials: 'MH' },
      { id: 'testimonial-2', quote: 'From discovery to delivery, the process was seamless. We launched with confidence thanks to the talented creatives matched to our brand.', name: 'Alex Rivera', role: 'Founder, Northline', initials: 'AR' },
      { id: 'testimonial-3', quote: 'The attention to detail and storytelling approach helped us stand out in a crowded market. The results exceeded our expectations.', name: 'Noah Lewis', role: 'Marketing Lead', initials: 'NL' }
    ],
    legalPages: {
      terms: 'Pawapix Terms of Service\n\nEffective date: September 6, 2026\n\n1. Using Pawapix\nPawapix connects customers with independent creative service providers. You must provide accurate account information, protect your login credentials, and use the platform lawfully.\n\n2. Projects and payments\nCustomers are responsible for clear project briefs and agreed payments. Creative providers are responsible for delivering work as agreed. Payment, refund, and completion decisions may be recorded in the platform dashboard.\n\n3. Files and intellectual property\nOnly upload content you have permission to share. Customers and creatives should agree on ownership and permitted use before delivery. Do not upload unlawful, harmful, or confidential material without authorization.\n\n4. Account safety\nWe may suspend or restrict accounts involved in fraud, abuse, impersonation, harassment, or attempts to compromise the platform. Contact support if you believe your account is at risk.\n\n5. Contact\nFor questions about these terms, contact Pawapix support through the inquiry form on the website.',
      privacy: 'Pawapix Privacy Policy\n\nEffective date: September 6, 2026\n\n1. Information we collect\nWe collect information you provide, such as your name, email address, username, location, account details, project messages, payment records, and uploaded files.\n\n2. How we use information\nWe use information to create accounts, support projects, process platform activity, send requested notifications, prevent abuse, and improve Pawapix services.\n\n3. Sharing\nWe share information only as needed to provide requested marketplace, project, payment, support, email, and hosting services, or when required by law. We do not sell personal information.\n\n4. Retention and security\nWe use access controls, authentication, protected server routes, backups, and secure operational practices. No online service can guarantee absolute security, so protect your password and notify us of suspicious activity.\n\n5. Your choices\nYou may request corrections to your account details through support. Some records may be retained where needed for legal, security, payment, or dispute purposes.\n\n6. Contact\nQuestions about privacy can be sent through the Pawapix support form.',
      sitemap: 'Pawapix Sitemap\n\nMain pages\n- Home\n- Services\n- Top Creatives\n- Pricing Plans\n- How It Works\n- Client Testimonials\n- Support and Inquiries\n\nAccount areas\n- Login and Sign Up\n- Customer Dashboard\n- Creative Dashboard\n- Work Cloud\n\nAdministrative area\n- Admin Dashboard\n- Users\n- Services\n- Plans\n- Payments\n- Site Settings'
    },
    supportContacts: { email: 'support@pawapix.com', phone: '+234 800 000 0000', whatsapp: '+234 800 000 0000' }
  },
  users: [
    {
      id: 1,
      name: 'Pawapix Client',
      email: 'client@pawapix.com',
      password: 'clientpass',
      role: 'customer',
      balance: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Creative Partner',
      email: 'creative@pawapix.com',
      password: 'creativepass',
      role: 'creative',
      balance: 0,
      createdAt: new Date().toISOString()
    }
  ],
  withdrawals: [],
  deposits: [],
  works: []
  ,cloudFiles: []
  ,cloudTransfers: []
  ,ratings: []
  ,chatKeys: {}
  ,chatMessages: []
};

function loadData() {
  if (fs.existsSync(dataFilePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      const users = Array.isArray(parsed.users) ? parsed.users.map(normalizeStoredUser) : loadUsersBackup();
      const loadedState = {
        gigs: Array.isArray(parsed.gigs) && parsed.gigs.length ? parsed.gigs : seedData.gigs,
        creatives: Array.isArray(parsed.creatives) && parsed.creatives.length ? parsed.creatives : seedData.creatives,
        applications: Array.isArray(parsed.applications) ? parsed.applications : [],
        contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
        plans: (Array.isArray(parsed.plans) && parsed.plans.length ? parsed.plans : seedData.plans).map((plan) => ({ ...plan, currency: 'NGN' })),
        paymentConfig: { ...seedData.paymentConfig, ...(parsed.paymentConfig || {}), currencies: ['NGN'] },
        withdrawalSettings: { ...seedData.withdrawalSettings, ...(parsed.withdrawalSettings || {}), minimumAmount: Math.max(10000, Number(parsed.withdrawalSettings?.minimumAmount || 10000)), currency: 'NGN', methods: ['bank transfer'] },
        siteSettings: { ...seedData.siteSettings, ...(parsed.siteSettings || {}), socialLinks: { ...seedData.siteSettings.socialLinks, ...(parsed.siteSettings?.socialLinks || {}) }, testimonials: Array.isArray(parsed.siteSettings?.testimonials) ? parsed.siteSettings.testimonials : seedData.siteSettings.testimonials, legalPages: { ...seedData.siteSettings.legalPages, ...(parsed.siteSettings?.legalPages || {}) }, supportContacts: { ...seedData.siteSettings.supportContacts, ...(parsed.siteSettings?.supportContacts || {}) } },
        users,
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        works: Array.isArray(parsed.works) ? parsed.works : [],
        cloudFiles: Array.isArray(parsed.cloudFiles) ? parsed.cloudFiles : [],
        cloudTransfers: Array.isArray(parsed.cloudTransfers) ? parsed.cloudTransfers : [],
        ratings: Array.isArray(parsed.ratings) ? parsed.ratings : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        chatKeys: parsed.chatKeys && typeof parsed.chatKeys === 'object' ? parsed.chatKeys : {},
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : []
      };
      return loadedState;
    } catch (error) {
      const recoveredUsers = loadUsersBackup();
      if (recoveredUsers.length) {
        console.warn('Unable to load the main data store; preserving users from backup.', error.message);
        const recoveredState = { ...seedData, users: recoveredUsers, applications: [], contacts: [], withdrawals: [], deposits: [], works: [], cloudFiles: [], cloudTransfers: [], ratings: [], notifications: [], chatKeys: {}, chatMessages: [] };
        saveData(recoveredState);
        return recoveredState;
      }
      throw new Error(`Unable to load the data store safely: ${error.message}`);
    }
  }

  const safeSeedUsers = seedData.users.map(normalizeStoredUser);
  const safeSeedData = { ...seedData, users: safeSeedUsers };
  saveData(safeSeedData);
  return {
    gigs: seedData.gigs,
    creatives: seedData.creatives,
    applications: [],
    contacts: [],
    plans: seedData.plans,
    paymentConfig: seedData.paymentConfig,
    withdrawalSettings: seedData.withdrawalSettings,
    siteSettings: seedData.siteSettings,
    users: safeSeedUsers,
    withdrawals: seedData.withdrawals,
    deposits: seedData.deposits,
    works: seedData.works,
    cloudFiles: [],
    cloudTransfers: [],
    ratings: [],
    notifications: [],
    chatKeys: {},
    chatMessages: []
  };
}

function saveData(data) {
  const temporaryPath = `${dataFilePath}.tmp`;
  const temporaryUsersBackupPath = `${usersBackupPath}.tmp`;
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(temporaryPath, serialized, 'utf8');
  if (Array.isArray(data.users)) {
    const serializedUsers = JSON.stringify(data.users, null, 2);
    fs.writeFileSync(temporaryUsersBackupPath, serializedUsers, 'utf8');
    try {
      fs.renameSync(temporaryUsersBackupPath, usersBackupPath);
    } catch (error) {
      if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
      fs.writeFileSync(usersBackupPath, serializedUsers, 'utf8');
      if (fs.existsSync(temporaryUsersBackupPath)) fs.unlinkSync(temporaryUsersBackupPath);
    }
  }
  try {
    fs.renameSync(temporaryPath, dataFilePath);
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
    fs.writeFileSync(dataFilePath, serialized, 'utf8');
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function loadUsersBackup() {
  if (!fs.existsSync(usersBackupPath)) return [];
  try {
    const users = JSON.parse(fs.readFileSync(usersBackupPath, 'utf8'));
    return Array.isArray(users) ? users.map(normalizeStoredUser) : [];
  } catch (error) {
    return [];
  }
}

const state = loadData();

function getState() {
  return state;
}

function getChatKey(ownerId) {
  return state.chatKeys[String(ownerId)] || null;
}

function saveChatKey(ownerId, publicKey) {
  if (!publicKey || typeof publicKey !== 'object') return null;
  state.chatKeys[String(ownerId)] = publicKey;
  saveData(state);
  return publicKey;
}

function getChatMessages(userId) {
  return state.chatMessages.filter((message) => message.userId === Number(userId));
}

function createChatMessage(userId, sender, ciphertext, iv) {
  const message = { id: createId(), userId: Number(userId), sender, ciphertext, iv, createdAt: new Date().toISOString() };
  state.chatMessages.push(message);
  saveData(state);
  return message;
}

function getGigs(search = '', category = '') {
  const query = search.toLowerCase();
  return state.gigs.filter((gig) => {
    const haystack = [gig.title, gig.description, gig.creative, ...(gig.tags || [])].join(' ').toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesCategory = !category || (gig.tags || []).some((tag) => tag.toLowerCase() === category.toLowerCase());
    return matchesSearch && matchesCategory;
  });
}

function getGigById(id) {
  return state.gigs.find((gig) => gig.id === Number(id));
}

function createGig(payload) {
  const nextGig = {
    id: createId(),
    title: payload.title || 'Untitled gig',
    creative: payload.creative || 'TBD',
    price: Number(payload.price || 0),
    delivery: payload.delivery || 'Flexible',
    description: payload.description || '',
    rating: Number(payload.rating || 4.5),
    tags: Array.isArray(payload.tags) ? payload.tags : []
  };

  state.gigs.unshift(nextGig);
  saveData(state);
  return nextGig;
}

function updateGig(id, payload) {
  const gig = state.gigs.find((item) => item.id === Number(id));
  if (!gig) return null;

  Object.assign(gig, payload);
  saveData(state);
  return gig;
}

function deleteGig(id) {
  const before = state.gigs.length;
  state.gigs = state.gigs.filter((gig) => gig.id !== Number(id));
  saveData(state);
  return state.gigs.length < before;
}

function getCreatives(search = '', specialty = '') {
  const query = search.toLowerCase();
  return state.creatives.filter((creative) => {
    const haystack = [creative.name, creative.specialty, creative.location, ...(creative.tags || [])].join(' ').toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesSpecialty = !specialty || creative.specialty.toLowerCase().includes(specialty.toLowerCase());
    return matchesSearch && matchesSpecialty;
  });
}

function getPublicCreatives(search = '', sort = 'rating') {
  const query = normalizeText(search).toLowerCase();
  const publicCreatives = state.users
    .filter((user) => user.role === 'creative')
    .map((user) => {
      const ratings = state.ratings.filter((rating) => rating.creativeId === user.id);
      const portfolio = state.works.filter((work) => work.userId === user.id);
      const averageRating = ratings.length
        ? ratings.reduce((total, rating) => total + Number(rating.rating || 0), 0) / ratings.length
        : Number(user.rating || 0);
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        specialty: user.specialty || 'Creative services',
        location: user.location || 'Remote',
        tags: Array.isArray(user.tags) ? user.tags : [],
        servicePrice: Number(user.servicePrice || 0),
        rating: Number(averageRating.toFixed(2)),
        ratingCount: ratings.length,
        profilePicUrl: user.profilePicUrl || '',
        portfolio: portfolio.map(({ id, title, description, fileName, fileUrl, fileType, amount, createdAt }) => ({ id, title, description, fileName, fileUrl, fileType, amount, createdAt }))
      };
    })
    .filter((creative) => !query || [creative.name, creative.username, creative.specialty, creative.location].join(' ').toLowerCase().includes(query))
    .sort((left, right) => sort === 'price' ? left.servicePrice - right.servicePrice : right.rating - left.rating);
  return publicCreatives;
}

function getCreativeById(id) {
  return state.creatives.find((creative) => creative.id === Number(id));
}

function createCreative(payload) {
  const nextCreative = {
    id: createId(),
    name: payload.name || 'New Creative',
    specialty: payload.specialty || 'Creative Services',
    location: payload.location || 'Remote',
    hourlyRate: Number(payload.hourlyRate || 0),
    rating: Number(payload.rating || 4.5),
    tags: Array.isArray(payload.tags) ? payload.tags : []
  };

  state.creatives.unshift(nextCreative);
  saveData(state);
  return nextCreative;
}

function updateCreative(id, payload) {
  const creative = state.creatives.find((item) => item.id === Number(id));
  if (!creative) return null;

  Object.assign(creative, payload);
  saveData(state);
  return creative;
}

function deleteCreative(id) {
  const before = state.creatives.length;
  state.creatives = state.creatives.filter((creative) => creative.id !== Number(id));
  saveData(state);
  return state.creatives.length < before;
}

function getApplications() {
  return state.applications;
}

function createApplication(payload) {
  const application = {
    id: createId(),
    status: 'received',
    submittedAt: new Date().toISOString(),
    ...payload
  };
  if (application.type === 'project' && application.mediaFileName) {
    application.mediaUrl = `/api/user/projects/${application.id}/media`;
  }

  state.applications.unshift(application);
  saveData(state);
  return application;
}

function getContacts() {
  return state.contacts;
}

function createContact(payload) {
  const contact = {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...payload
  };

  state.contacts.unshift(contact);
  saveData(state);
  return contact;
}

function getUsers() {
  return state.users;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeName(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function normalizeUsername(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, '');
}

function normalizeNationalId(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash || '').split(':');
  if (!salt || !storedHash) return false;
  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return storedHash.length === candidateHash.length && crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(candidateHash, 'hex'));
}

function normalizeStoredUser(user) {
  const normalizedUser = { ...user };
  const legacyPassword = typeof normalizedUser.password === 'string' ? normalizedUser.password : '';
  delete normalizedUser.password;
  if (!normalizedUser.passwordHash && legacyPassword) normalizedUser.passwordHash = hashPassword(legacyPassword);
  return normalizedUser;
}

function canSendCloudTransfer(sender, agreedAmount = 0) {
  if (!sender) return false;
  if (sender.role === 'creative') return true;
  if (sender.role === 'customer') return Number(agreedAmount || 0) > 0 && Number(sender.balance || 0) >= Number(agreedAmount || 0);
  return false;
}

function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return state.users.find((user) => normalizeEmail(user.email) === normalizedEmail);
}

function getUserByName(name) {
  const normalizedName = normalizeName(name).toLowerCase();
  return state.users.find((user) => normalizeName(user.name).toLowerCase() === normalizedName);
}

function getUserByUsername(username) {
  const normalizedUsername = normalizeUsername(username);
  return state.users.find((user) => normalizeUsername(user.username) === normalizedUsername);
}

function getUserByNationalId(nationalId) {
  const normalizedNationalId = normalizeNationalId(nationalId);
  return state.users.find((user) => normalizeNationalId(user.nationalId) === normalizedNationalId);
}

function createUser(payload) {
  const normalizedName = normalizeName(payload.name || payload.email) || normalizeEmail(payload.email);
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedPassword = normalizeText(payload.password || '');
  const normalizedUsername = normalizeUsername(payload.username || payload.email);
  const normalizedNationalId = normalizeNationalId(payload.nationalId || '');

  if (state.users.some((user) => normalizeEmail(user.email) === normalizedEmail)) return null;
  if (normalizedNationalId && state.users.some((user) => normalizeNationalId(user.nationalId) === normalizedNationalId)) return null;

  const nextUser = {
    id: createId(),
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: hashPassword(normalizedPassword),
    username: normalizedUsername,
    nationalId: normalizedNationalId,
    role: payload.role || 'customer',
    balance: Number(payload.balance ?? 0),
    profilePicUrl: payload.profilePicUrl || '',
    specialty: normalizeText(payload.specialty || ''),
    location: normalizeText(payload.location || 'Remote'),
    servicePrice: Math.max(0, Number(payload.servicePrice || 0)),
    payoutDetails: {
      bankName: normalizeText(payload.payoutDetails?.bankName || ''),
      accountName: normalizeText(payload.payoutDetails?.accountName || ''),
      accountNumber: normalizeText(payload.payoutDetails?.accountNumber || '')
    },
    createdAt: new Date().toISOString()
  };

  state.users.unshift(nextUser);
  Object.defineProperty(nextUser, 'password', { value: normalizedPassword, enumerable: false, writable: true, configurable: true });
  saveData(state);
  return nextUser;
}

function getUserById(id) {
  return state.users.find((user) => user.id === Number(id));
}

function getUserDashboardData(userId) {
  const user = getUserById(userId);
  if (!user) return null;

  const userApplications = state.applications.filter((item) => item.userId === Number(userId) || item.projectOwnerId === Number(userId));
  const creativeApplications = state.applications.filter((item) => item.applicantCreativeId === Number(userId));
  const availableProjects = state.applications.filter((item) => item.type === 'project' && !item.applicantCreativeId && ['received', 'open'].includes(item.status));
  const ownedProjects = state.applications.filter((item) => item.type === 'project' && item.userId === Number(userId));

  return {
    user: (() => {
      const { password, passwordHash, ...safeUser } = user;
      return safeUser;
    })(),
    balance: Number(user.balance || 0),
    withdrawals: state.withdrawals.filter((item) => item.userId === Number(userId)),
    deposits: state.deposits.filter((item) => item.userId === Number(userId)),
    works: state.works.filter((item) => item.userId === Number(userId)),
    applications: userApplications,
    projects: ownedProjects,
    creativeApplications,
    availableProjects,
    withdrawalSettings: state.withdrawalSettings,
    notifications: state.notifications.filter((item) => item.userId === Number(userId)).slice(0, 8),
    activeProjects: ownedProjects.filter((item) => ['open', 'received'].includes(item.status)).length,
    completedProjects: ownedProjects.filter((item) => item.status === 'completed').length,
    pendingProjects: ownedProjects.filter((item) => item.status === 'accepted').length,
    uploads: state.works.filter((item) => item.userId === Number(userId)).length,
    ratings: state.ratings.filter((item) => item.userId === Number(userId))
  };
}

function createDeposit(userId, amount, method = 'stripe', reference = '') {
  const user = getUserById(userId);
  if (!user) return null;

  const existingDeposit = reference && state.deposits.find((item) => item.reference === reference && item.userId === Number(userId));
  if (existingDeposit) return { ...existingDeposit, balance: user.balance };

  const safeAmount = Number(amount || 0);
  if (!safeAmount || safeAmount <= 0) return null;

  user.balance = Number(user.balance || 0) + safeAmount;

  const deposit = {
    id: createId(),
    userId: Number(userId),
    amount: safeAmount,
    method,
    reference: reference || undefined,
    status: 'completed',
    createdAt: new Date().toISOString()
  };

  state.deposits.unshift(deposit);
  saveData(state);
  return { ...deposit, balance: user.balance };
}

function createWithdrawal(userId, amount, method = 'bank', payoutDetails = {}) {
  const user = getUserById(userId);
  if (!user) return null;

  const safeAmount = Number(amount || 0);
  const settings = state.withdrawalSettings;
  if (!settings.enabled || !safeAmount || safeAmount <= 0) return null;
  if (safeAmount < Number(settings.minimumAmount || 0) || safeAmount > Number(settings.maximumAmount || Infinity)) return null;
  if (safeAmount > Number(user.balance || 0)) return null;

  const fee = Number(settings.fixedFee || 0) + safeAmount * Number(settings.percentageFee || 0) / 100;
  const netAmount = Math.max(0, safeAmount - fee);

  user.balance = Number(user.balance || 0) - safeAmount;

  const withdrawal = {
    id: createId(),
    userId: Number(userId),
    amount: safeAmount,
    fee,
    netAmount,
    currency: 'NGN',
    method: 'bank transfer',
    bankName: payoutDetails.bankName,
    accountName: payoutDetails.accountName,
    accountNumberMasked: `****${payoutDetails.accountNumber.slice(-4)}`,
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  state.withdrawals.unshift(withdrawal);
  saveData(state);
  return { ...withdrawal, balance: user.balance };
}

function getWithdrawalSettings() {
  return state.withdrawalSettings;
}

function updateWithdrawalSettings(payload) {
  state.withdrawalSettings = {
    ...state.withdrawalSettings,
    ...payload,
    minimumAmount: Math.max(10000, Number(payload.minimumAmount ?? state.withdrawalSettings.minimumAmount)),
    maximumAmount: Math.max(0, Number(payload.maximumAmount ?? state.withdrawalSettings.maximumAmount)),
    fixedFee: Math.max(0, Number(payload.fixedFee ?? state.withdrawalSettings.fixedFee)),
    percentageFee: Math.max(0, Number(payload.percentageFee ?? state.withdrawalSettings.percentageFee))
  };
  state.withdrawalSettings.currency = 'NGN';
  state.withdrawalSettings.methods = ['bank transfer'];
  saveData(state);
  return state.withdrawalSettings;
}

function updateWithdrawalStatus(id, status, payload = {}) {
  const withdrawal = state.withdrawals.find((item) => item.id === Number(id));
  if (!withdrawal) return null;
  const terminalFailure = ['rejected', 'failed', 'cancelled'].includes(status);
  if (terminalFailure && !withdrawal.balanceReturned) {
    const user = getUserById(withdrawal.userId);
    if (user) user.balance = Number(user.balance || 0) + Number(withdrawal.amount || 0);
    withdrawal.balanceReturned = true;
  }
  withdrawal.status = status;
  if (payload.reason) withdrawal.reason = String(payload.reason).trim();
  if (payload.reference) withdrawal.reference = String(payload.reference).trim();
  if (status === 'completed') withdrawal.completedAt = new Date().toISOString();
  if (status === 'approved') withdrawal.approvedAt = new Date().toISOString();
  saveData(state);
  return withdrawal;
}

function createWork(payload) {
  const uploader = getUserById(payload.userId);

  const work = {
    id: createId(),
    userId: Number(payload.userId),
    title: payload.title || 'Untitled work',
    description: payload.description || '',
    fileName: payload.fileName || '',
    fileUrl: payload.fileUrl || '',
    fileType: payload.fileType || 'file',
    amount: Math.max(0, Number(payload.amount || 0)),
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  state.works.unshift(work);
  saveData(state);

  return work;
}

function createCloudFile(payload) {
  const file = {
    id: createId(),
    ownerId: Number(payload.ownerId),
    fileName: payload.fileName || 'Untitled file',
    fileUrl: payload.fileUrl || '',
    fileType: payload.fileType || 'file',
    size: Number(payload.size || 0),
    createdAt: new Date().toISOString()
  };
  state.cloudFiles.unshift(file);
  saveData(state);
  return file;
}

function getCloudData(userId) {
  const id = Number(userId);
  const received = state.cloudTransfers.filter((transfer) => transfer.recipientId === id).map((transfer) => ({
    ...transfer,
    files: transfer.fileIds.map((fileId) => state.cloudFiles.find((file) => file.id === fileId)).filter(Boolean)
  }));
  return {
    files: state.cloudFiles.filter((file) => file.ownerId === id),
    sent: state.cloudTransfers.filter((transfer) => transfer.senderId === id),
    received
  };
}

function getCloudFileById(fileId) {
  return state.cloudFiles.find((file) => file.id === Number(fileId));
}

function createCloudTransfer(senderId, recipientUsername, fileIds, message = '', agreedAmount = 0, projectId = null) {
  const recipient = getUserByUsername(recipientUsername);
  if (!recipient || recipient.id === Number(senderId)) return null;
  const files = state.cloudFiles.filter((file) => file.ownerId === Number(senderId) && fileIds.map(Number).includes(file.id));
  if (!files.length) return null;
  const transfer = {
    id: createId(),
    senderId: Number(senderId),
    recipientId: recipient.id,
    recipientUsername: recipient.username,
    fileIds: files.map((file) => file.id),
    fileNames: files.map((file) => file.fileName),
    message: normalizeText(message),
    projectId: projectId ? Number(projectId) : null,
    agreedAmount: Math.max(0, Number(agreedAmount || 0)),
    status: 'sent',
    createdAt: new Date().toISOString()
  };
  state.cloudTransfers.unshift(transfer);
  saveData(state);
  return transfer;
}

function completeCloudTransfer(transferId, recipientId) {
  const transfer = state.cloudTransfers.find((item) => item.id === Number(transferId));
  if (!transfer || transfer.recipientId !== Number(recipientId)) return { error: 'Transfer not found.' };
  if (transfer.status === 'completed') return { transfer, alreadyCompleted: true };

  const customer = getUserById(transfer.recipientId);
  const creative = getUserById(transfer.senderId);
  const amount = Number(transfer.agreedAmount || 0);
  if (!customer || !creative || customer.role !== 'customer' || creative.role !== 'creative') return { error: 'Only a customer can complete work sent by a creative.' };
  if (['downloaded', 'resolved'].includes(transfer.status)) {
    transfer.status = 'completed';
    transfer.completedAt = new Date().toISOString();
    if (transfer.projectId) {
      const project = getApplicationById(transfer.projectId);
      if (project && project.type === 'project') {
        project.status = 'completed';
        project.completedAt = transfer.completedAt;
      }
    }
    saveData(state);
    return { transfer, customer, creative, amount: 0, alreadyCompleted: true };
  }
  if (transfer.status !== 'sent') return { error: 'This project transfer cannot be completed in its current state.' };
  if (amount <= 0) return { error: 'This project has no agreed amount.' };
  if (Number(customer.balance || 0) < amount) return { error: 'Insufficient balance to complete this project.' };

  customer.balance = Number(customer.balance || 0) - amount;
  creative.balance = Number(creative.balance || 0) + amount;
  transfer.status = 'completed';
  transfer.completedAt = new Date().toISOString();
  if (transfer.projectId) {
    const project = getApplicationById(transfer.projectId);
    if (project && project.type === 'project') {
      project.status = 'completed';
      project.completedAt = transfer.completedAt;
    }
  }
  saveData(state);
  return { transfer, customer, creative, amount };
}

function processProjectDownload(transferId, customerId) {
  const transfer = state.cloudTransfers.find((item) => item.id === Number(transferId));
  if (!transfer || transfer.recipientId !== Number(customerId)) return { error: 'Transfer not found.' };
  if (transfer.status === 'flagged') return { error: 'This project is currently under dispute review.' };
  if (['downloaded', 'completed', 'resolved'].includes(transfer.status)) return { transfer, alreadyDownloaded: true, amount: 0 };
  if (transfer.status !== 'sent') return { error: 'This project transfer cannot be downloaded in its current state.' };

  const customer = getUserById(customerId);
  const creative = getUserById(transfer.senderId);
  const amount = Number(transfer.agreedAmount || 0);

  if (!customer || !creative) return { error: 'Project participants could not be found.' };
  if (customer.role !== 'customer' || creative.role !== 'creative') return { error: 'This project transfer is invalid.' };
  if (amount > 0 && Number(customer.balance || 0) < amount) return { error: 'Insufficient balance to download this work.' };

  if (amount > 0) {
    customer.balance = Number(customer.balance || 0) - amount;
    creative.balance = Number(creative.balance || 0) + amount;
  }

  transfer.status = 'downloaded';
  transfer.downloadedAt = new Date().toISOString();
  transfer.amountSettled = amount;
  saveData(state);
  return { transfer, customer, creative, amount };
}

function flagProjectComplaint(transferId, customerId, complaint = '') {
  const transfer = state.cloudTransfers.find((item) => item.id === Number(transferId));
  if (!transfer || transfer.recipientId !== Number(customerId)) return { error: 'Transfer not found.' };
  const message = normalizeText(complaint);
  if (!message) return { error: 'A complaint message is required.' };

  transfer.status = 'flagged';
  transfer.customerComplaint = message;
  transfer.flaggedAt = new Date().toISOString();
  transfer.flaggedAmount = Number(transfer.agreedAmount || 0);

  const creative = getUserById(transfer.senderId);
  if (creative) {
    createNotification(creative.id, `A customer raised a review on project ${transfer.fileNames.join(', ') || 'delivery'}. Please review and send the corrected work.`, 'project-flagged');
  }

  saveData(state);
  return { transfer, creative };
}

function resolveProjectComplaint(transferId, creativeId) {
  const transfer = state.cloudTransfers.find((item) => item.id === Number(transferId));
  if (!transfer || transfer.senderId !== Number(creativeId)) return { error: 'Transfer not found.' };
  if (transfer.status !== 'flagged') return { error: 'This project is not currently flagged.' };

  transfer.status = 'resolved';
  transfer.resolvedAt = new Date().toISOString();
  transfer.customerComplaint = transfer.customerComplaint || '';
  saveData(state);
  return { transfer };
}

function getCloudStats() {
  return {
    files: state.cloudFiles.length,
    storageBytes: state.cloudFiles.reduce((total, file) => total + Number(file.size || 0), 0),
    transfers: state.cloudTransfers.length,
    activeTransfers: state.cloudTransfers.filter((transfer) => transfer.status === 'sent').length,
    receivedTransfers: state.cloudTransfers.filter((transfer) => transfer.status !== 'sent').length
  };
}

function updateUserProfile(userId, updates) {
  const user = getUserById(userId);
  if (!user) return null;
  if (updates.name) user.name = updates.name;
  if (updates.username !== undefined) user.username = normalizeUsername(updates.username);
  if (updates.profilePicUrl) user.profilePicUrl = updates.profilePicUrl;
  if (updates.specialty !== undefined) user.specialty = normalizeText(updates.specialty);
  if (updates.location !== undefined) user.location = normalizeText(updates.location) || 'Remote';
  if (updates.servicePrice !== undefined) user.servicePrice = Math.max(0, Number(updates.servicePrice || 0));
  if (updates.payoutDetails) user.payoutDetails = {
    ...(user.payoutDetails || {}),
    bankName: normalizeText(updates.payoutDetails.bankName),
    accountName: normalizeText(updates.payoutDetails.accountName),
    accountNumber: normalizeText(updates.payoutDetails.accountNumber)
  };
  saveData(state);
  return user;
}

function updateAdminUser(userId, updates) {
  const user = getUserById(userId);
  if (!user) return null;

  const email = updates.email !== undefined ? normalizeEmail(updates.email) : user.email;
  const username = updates.username !== undefined ? normalizeUsername(updates.username) : user.username;
  const nationalId = updates.nationalId !== undefined ? normalizeNationalId(updates.nationalId) : user.nationalId;
  if (!email || state.users.some((item) => item.id !== user.id && normalizeEmail(item.email) === email)) return { error: 'Email is already in use.' };
  if (state.users.some((item) => item.id !== user.id && normalizeUsername(item.username) === username)) return { error: 'Username is already in use.' };
  if (nationalId && state.users.some((item) => item.id !== user.id && normalizeNationalId(item.nationalId) === nationalId)) return { error: 'National ID is already in use.' };

  user.name = normalizeName(updates.name || user.name);
  user.email = email;
  user.username = username;
  user.nationalId = nationalId;
  user.role = ['customer', 'creative'].includes(updates.role) ? updates.role : user.role;
  user.specialty = normalizeText(updates.specialty ?? user.specialty);
  user.location = normalizeText(updates.location ?? user.location) || 'Remote';
  if (updates.servicePrice !== undefined) user.servicePrice = Math.max(0, Number(updates.servicePrice || 0));
  if (updates.balance !== undefined) user.balance = Number(updates.balance || 0);
  saveData(state);
  return user;
}

function updateUserPassword(userId, password) {
  const user = getUserById(userId);
  if (!user) return null;
  const normalizedPassword = normalizeText(password);
  user.passwordHash = hashPassword(normalizedPassword);
  Object.defineProperty(user, 'password', { value: normalizedPassword, enumerable: false, writable: true, configurable: true });
  saveData(state);
  return user;
}

function verifyUserPassword(user, password) {
  if (!user) return false;
  if (user.passwordHash && verifyPassword(password, user.passwordHash)) return true;
  if (typeof user.password === 'string' && user.password === password) {
    user.passwordHash = hashPassword(password);
    delete user.password;
    saveData(state);
    return true;
  }
  return false;
}

function createRating(userId, creativeId, applicationId, rating, review = '') {
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return null;
  if (state.ratings.some((item) => item.userId === Number(userId) && item.applicationId === Number(applicationId))) return null;
  const nextRating = { id: createId(), userId: Number(userId), creativeId: Number(creativeId), applicationId: Number(applicationId), rating: numericRating, review: normalizeText(review), createdAt: new Date().toISOString() };
  state.ratings.unshift(nextRating);
  saveData(state);
  return nextRating;
}

function getNotificationsByUserId(userId) {
  return state.notifications.filter((item) => item.userId === Number(userId));
}

function clearExpiredCloudData(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  const expiredFileIds = new Set(state.cloudFiles.filter((file) => new Date(file.createdAt).getTime() < cutoff).map((file) => file.id));
  state.cloudTransfers = state.cloudTransfers.filter((transfer) => new Date(transfer.createdAt).getTime() >= cutoff);
  state.cloudFiles = state.cloudFiles.filter((file) => !expiredFileIds.has(file.id));
  saveData(state);
}

function createNotification(userId, message, category = 'info') {
  const notification = {
    id: createId(),
    userId: Number(userId),
    message,
    category,
    read: false,
    createdAt: new Date().toISOString()
  };

  state.notifications.unshift(notification);
  saveData(state);
  return notification;
}

function getApplicationById(id) {
  return state.applications.find((application) => application.id === Number(id));
}

function updateApplicationStatus(id, status, payload = {}) {
  const application = getApplicationById(id);
  if (!application) return null;
  if (application.status === 'completed' && status === 'completed') {
    return application;
  }

  application.status = status;
  if (payload.creativeId) {
    application.creativeId = Number(payload.creativeId);
  }
  if (payload.applicantCreativeId) application.applicantCreativeId = Number(payload.applicantCreativeId);
  if (payload.creativeUsername) application.creativeUsername = String(payload.creativeUsername).trim();
  if (payload.agreedPrice !== undefined) application.agreedPrice = Math.max(0, Number(payload.agreedPrice || 0));
  if (payload.acceptedAt) application.acceptedAt = payload.acceptedAt;

  if (status === 'completed') {
    const completionCredit = 20;
    const targetUserId = application.creativeId || application.assignedCreativeId || application.recipientUserId;
    const targetUser = targetUserId ? getUserById(targetUserId) : state.users.find((user) => user.role === 'creative');
    const customer = application.userId ? getUserById(application.userId) : null;

    const canChargeCustomer = !customer || Number(customer.balance || 0) >= completionCredit;
    if (customer && canChargeCustomer) {
      customer.balance = Number(customer.balance || 0) - completionCredit;
    }

    if (targetUser && canChargeCustomer) {
      targetUser.balance = Number(targetUser.balance || 0) + completionCredit;
      createNotification(targetUser.id, `A completed project has been confirmed. ${completionCredit} was added to your balance.`, 'project-complete');
    }
  }

  saveData(state);
  return application;
}

function deleteUser(id) {
  const before = state.users.length;
  state.users = state.users.filter((user) => user.id !== Number(id));
  saveData(state);
  return state.users.length < before;
}

function getPlans() {
  return state.plans;
}

function getPlanById(id) {
  return state.plans.find((plan) => plan.id === Number(id));
}

function createPlan(payload) {
  const plan = {
    id: createId(),
    name: payload.name || 'New Plan',
    price: Number(payload.price || 0),
    currency: 'NGN',
    interval: payload.interval || 'month',
    features: Array.isArray(payload.features) ? payload.features : [],
    paymentGateway: payload.paymentGateway || state.paymentConfig.gateway
  };

  state.plans.unshift(plan);
  saveData(state);
  return plan;
}

function updatePlan(id, payload) {
  const plan = state.plans.find((item) => item.id === Number(id));
  if (!plan) return null;

  Object.assign(plan, payload, { currency: 'NGN' });
  saveData(state);
  return plan;
}

function deletePlan(id) {
  const before = state.plans.length;
  state.plans = state.plans.filter((plan) => plan.id !== Number(id));
  saveData(state);
  return state.plans.length < before;
}

function getPaymentConfig() {
  return state.paymentConfig;
}

function getSiteSettings() {
  return state.siteSettings;
}

function updateSiteSettings(payload) {
  const socialLinks = Object.fromEntries(
    Object.entries(payload.socialLinks || state.siteSettings.socialLinks).filter(([name, url]) => ['Facebook', 'Instagram', 'X'].includes(name) && typeof url === 'string')
  );
  const testimonials = Array.isArray(payload.testimonials)
    ? payload.testimonials.map((item, index) => ({
      id: item.id || `testimonial-${Date.now()}-${index}`,
      quote: normalizeText(item.quote),
      name: normalizeText(item.name),
      role: normalizeText(item.role),
      initials: normalizeText(item.initials).slice(0, 4).toUpperCase()
    })).filter((item) => item.quote && item.name)
    : state.siteSettings.testimonials;
  const legalPages = Object.fromEntries(Object.entries(payload.legalPages || state.siteSettings.legalPages).filter(([name, content]) => ['terms', 'privacy', 'sitemap'].includes(name) && typeof content === 'string').map(([name, content]) => [name, content.trim()]));
  const supportContacts = Object.fromEntries(Object.entries(payload.supportContacts || state.siteSettings.supportContacts).filter(([name, value]) => ['email', 'phone', 'whatsapp'].includes(name) && typeof value === 'string').map(([name, value]) => [name, value.trim()]));
  state.siteSettings = { ...state.siteSettings, socialLinks: { ...state.siteSettings.socialLinks, ...socialLinks }, testimonials, legalPages: { ...state.siteSettings.legalPages, ...legalPages }, supportContacts: { ...state.siteSettings.supportContacts, ...supportContacts } };
  saveData(state);
  return state.siteSettings;
}

function getSafePaymentConfig() {
  const { webhookSecret, ...safeConfig } = state.paymentConfig;
  return {
    ...safeConfig,
    webhookSecretConfigured: Boolean(webhookSecret),
    webhookSecretMasked: webhookSecret ? '••••••••••••' : ''
  };
}

function updatePaymentConfig(payload) {
  const nextGateways = Array.isArray(payload.gateways)
    ? payload.gateways.filter(Boolean)
    : Array.isArray(state.paymentConfig.gateways)
      ? state.paymentConfig.gateways
      : [];

  if (payload.gateway && !nextGateways.includes(payload.gateway)) {
    nextGateways.push(payload.gateway);
  }

  const allowedFields = ['gateway', 'enabled', 'publicKey', 'methods', 'currencies', 'commissionRate', 'taxRate', 'minimumPayment', 'automaticConfirmation'];
  const updates = Object.fromEntries(allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(payload, field)).map((field) => [field, payload[field]]));
  if (typeof payload.webhookSecret === 'string' && payload.webhookSecret.trim()) {
    updates.webhookSecret = payload.webhookSecret.trim();
  }

  state.paymentConfig = {
    ...state.paymentConfig,
    ...updates,
    gateways: nextGateways
  };
  saveData(state);
  return state.paymentConfig;
}

function getStats() {
  const completedApplications = state.applications.filter((item) => item.status === 'completed').length;
  const totalDeposits = state.deposits.reduce((total, item) => total + Number(item.amount || 0), 0);
  const totalWithdrawals = state.withdrawals.reduce((total, item) => total + Number(item.amount || 0), 0);

  return {
    gigs: state.gigs.length,
    creatives: state.creatives.length,
    applications: state.applications.length,
    completedApplications,
    users: state.users.length,
    customers: state.users.filter((user) => user.role === 'customer').length,
    providers: state.users.filter((user) => user.role === 'creative').length,
    contacts: state.contacts.length,
    plans: state.plans.length,
    deposits: totalDeposits,
    withdrawals: totalWithdrawals,
    pendingWithdrawals: state.withdrawals.filter((item) => item.status === 'pending').length,
    gateway: state.paymentConfig.gateway
  };
}

function getFinanceData() {
  return {
    deposits: state.deposits.slice(0, 100),
    withdrawals: state.withdrawals.slice(0, 100),
    totals: {
      deposits: state.deposits.reduce((total, item) => total + Number(item.amount || 0), 0),
      withdrawals: state.withdrawals.reduce((total, item) => total + Number(item.amount || 0), 0),
      pendingWithdrawals: state.withdrawals.filter((item) => item.status === 'pending').length
    }
  };
}

module.exports = {
  getState,
  getChatKey,
  saveChatKey,
  getChatMessages,
  createChatMessage,
  getGigs,
  getGigById,
  createGig,
  updateGig,
  deleteGig,
  getCreatives,
  getPublicCreatives,
  getCreativeById,
  createCreative,
  updateCreative,
  deleteCreative,
  getApplications,
  createApplication,
  getContacts,
  createContact,
  getUsers,
  canSendCloudTransfer,
  getUserByEmail,
  getUserByName,
  getUserByUsername,
  getUserByNationalId,
  getUserById,
  getUserDashboardData,
  createUser,
  updateUserProfile,
  updateAdminUser,
  updateUserPassword,
  verifyUserPassword,
  createRating,
  createDeposit,
  createWithdrawal,
  getWithdrawalSettings,
  updateWithdrawalSettings,
  updateWithdrawalStatus,
  createWork,
  createCloudFile,
  getCloudFileById,
  getCloudData,
  createCloudTransfer,
  completeCloudTransfer,
  processProjectDownload,
  flagProjectComplaint,
  resolveProjectComplaint,
  getCloudStats,
  getNotificationsByUserId,
  clearExpiredCloudData,
  createNotification,
  getApplicationById,
  updateApplicationStatus,
  deleteUser,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  getPaymentConfig,
  getSiteSettings,
  getSafePaymentConfig,
  updatePaymentConfig,
  updateSiteSettings,
  getFinanceData,
  getStats
};
