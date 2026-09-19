require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  getState,
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
  getUserByEmail,
  getUserByName,
  getUserByUsername,
  getUserById,
  getUserDashboardData,
  createUser,
  updateUserProfile,
  updateAdminUser,
  updateUserPassword,
  verifyUserPassword,
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
  createRating,
  updateApplicationStatus,
  deleteUser,
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  canSendCloudTransfer,
  getPaymentConfig,
  getSafePaymentConfig,
  updatePaymentConfig,
  getSiteSettings,
  updateSiteSettings,
  getChatKey,
  saveChatKey,
  getChatMessages,
  createChatMessage,
  getFinanceData,
  getStats
} = require('./data');
const { sendEmail, sender: emailSender } = require('./email');

const app = express();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@pawapix.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const LEGACY_ADMIN_EMAIL = 'admin@pawapix.com';
const ADMIN_TOKENS = new Set();
const ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'change-this-admin-token-secret';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const USER_TOKENS = new Map();
const PASSWORD_RESET_TOKENS = new Map();
const USER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const uploadDir = path.join(__dirname, 'uploads');
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
const specialAdminCredentials = {
  email: (process.env.SPECIAL_ADMIN_EMAIL || 'special-admin@pawapix.com').toLowerCase(),
  password: process.env.SPECIAL_ADMIN_PASSWORD || 'pawapix-admin-2026'
};

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const requiredProductionVariables = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SPECIAL_ADMIN_EMAIL', 'SPECIAL_ADMIN_PASSWORD', 'ADMIN_TOKEN_SECRET', 'CLIENT_URL'];
  const missingProductionVariables = requiredProductionVariables.filter((name) => !process.env[name]?.trim());
  if (missingProductionVariables.length) {
    throw new Error(`Production requires: ${missingProductionVariables.join(', ')}.`);
  }
  let clientUrl;
  try {
    clientUrl = new URL(process.env.CLIENT_URL);
  } catch (error) {
    throw new Error('Production CLIENT_URL must be a valid HTTPS URL.');
  }
  if (clientUrl.protocol !== 'https:') throw new Error('Production CLIENT_URL must use HTTPS.');
  if (/(?:_test|demo)/i.test(JSON.stringify(getPaymentConfig()))) {
    throw new Error('Production payment configuration contains test or demo values.');
  }
}

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || '';
    const baseName = path.basename(file.originalname, extension).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${baseName}${extension}`);
  }
});
const allowedUploadMimeTypes = new Set([
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'application/msword', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip',
  'image/gif', 'image/jpeg', 'image/png', 'image/webp',
  'text/plain',
  'video/mp4', 'video/quicktime', 'video/webm'
]);
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimeTypes.has(file.mimetype)) return cb(new Error('Unsupported file type.'));
    cb(null, true);
  }
});
const DAILY_MS = 24 * 60 * 60 * 1000;

const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many authentication attempts. Please try again later.' } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many admin login attempts. Please try again later.' } });
const publicWriteLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });

app.disable('x-powered-by');
app.set('trust proxy', isProduction ? 1 : 0);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigin, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const isPublishedPortfolioFile = getState().works.some((work) => path.basename(work.fileUrl || '') === filename);
  if (!isPublishedPortfolioFile && !getFileAccessUserId(req.query.access, filename)) return res.status(404).json({ error: 'File not found.' });
  res.sendFile(path.join(uploadDir, filename));
});
setInterval(() => clearExpiredCloudData(), DAILY_MS).unref();

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || (!ADMIN_TOKENS.has(token) && !isValidAdminToken(token))) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}

function createAdminToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, issuedAt: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function isValidAdminToken(token) {
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return false;

  const expectedSignature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(payload).digest('base64url');
  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false;

  try {
    const { issuedAt, email } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Boolean(email) && Number.isFinite(issuedAt) && Date.now() - issuedAt < ADMIN_SESSION_TTL_MS;
  } catch (error) {
    return false;
  }
}

function userAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = USER_TOKENS.get(token) || getUserIdFromToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' });
  }

  req.userId = userId;
  next();
}

function optionalUserAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const userId = USER_TOKENS.get(token) || getUserIdFromToken(token);

  if (userId) {
    req.userId = userId;
  }

  next();
}

function createUserToken(userId) {
  const payload = Buffer.from(JSON.stringify({ userId: Number(userId), issuedAt: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(`user.${payload}`).digest('base64url');
  return `user.${payload}.${signature}`;
}

function getUserIdFromToken(token) {
  const [prefix, payload, signature] = String(token).split('.');
  if (prefix !== 'user' || !payload || !signature) return null;
  const expectedSignature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(`user.${payload}`).digest('base64url');
  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const { userId, issuedAt } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(issuedAt) && Date.now() - issuedAt < USER_SESSION_TTL_MS ? Number(userId) : null;
  } catch (error) {
    return null;
  }
}

function createFileAccessToken(filename, userId) {
  const payload = Buffer.from(JSON.stringify({ filename: path.basename(filename), userId: Number(userId), expiresAt: Date.now() + 15 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(`file.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

function getFileAccessUserId(token, filename) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expectedSignature = crypto.createHmac('sha256', ADMIN_TOKEN_SECRET).update(`file.${payload}`).digest('base64url');
  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.filename === path.basename(filename) && Number.isFinite(parsed.userId) && parsed.expiresAt > Date.now() ? Number(parsed.userId) : null;
  } catch (error) {
    return null;
  }
}

function createSignedFileUrl(fileUrl, userId) {
  const filename = path.basename(fileUrl || '');
  return `/uploads/${filename}?access=${encodeURIComponent(createFileAccessToken(filename, userId))}`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Pawapix API' });
});

app.get('/api/gigs', (req, res) => {
  const { search = '', category = '' } = req.query;
  res.json(getGigs(search, category));
});

app.get('/api/gigs/:id', (req, res) => {
  const gig = getGigById(req.params.id);
  if (!gig) return res.status(404).json({ error: 'Gig not found' });
  res.json(gig);
});

app.post('/api/gigs', adminAuth, (req, res) => {
  const { title, creative, price, delivery, description } = req.body;
  if (!title || !creative || !description) {
    return res.status(400).json({ error: 'Title, creative, and description are required' });
  }

  const gig = createGig(req.body);
  res.status(201).json(gig);
});

app.put('/api/gigs/:id', adminAuth, (req, res) => {
  const updatedGig = updateGig(req.params.id, req.body);
  if (!updatedGig) return res.status(404).json({ error: 'Gig not found' });
  res.json(updatedGig);
});

app.delete('/api/gigs/:id', adminAuth, (req, res) => {
  const removed = deleteGig(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Gig not found' });
  res.json({ success: true, message: 'Gig deleted' });
});

app.get('/api/creatives', (req, res) => {
  const { search = '', specialty = '' } = req.query;
  res.json(getCreatives(search, specialty));
});

app.get('/api/public/creatives', (req, res) => {
  const { search = '', limit = 6 } = req.query;
  const safeLimit = Math.min(12, Math.max(1, Number(limit) || 6));
  res.json(getPublicCreatives(search, 'rating').slice(0, safeLimit));
});

app.get('/api/user/creatives', userAuth, (req, res) => {
  const { search = '', sort = 'rating' } = req.query;
  res.json(getPublicCreatives(search, sort));
});

app.get('/api/creatives/:id', (req, res) => {
  const creative = getCreativeById(req.params.id);
  if (!creative) return res.status(404).json({ error: 'Creative not found' });
  res.json(creative);
});

app.post('/api/creatives', adminAuth, (req, res) => {
  const { name, specialty, location } = req.body;
  if (!name || !specialty || !location) {
    return res.status(400).json({ error: 'Name, specialty, and location are required' });
  }

  const creative = createCreative(req.body);
  res.status(201).json(creative);
});

app.put('/api/creatives/:id', adminAuth, (req, res) => {
  const updatedCreative = updateCreative(req.params.id, req.body);
  if (!updatedCreative) return res.status(404).json({ error: 'Creative not found' });
  res.json(updatedCreative);
});

app.delete('/api/creatives/:id', adminAuth, (req, res) => {
  const removed = deleteCreative(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Creative not found' });
  res.json({ success: true, message: 'Creative deleted' });
});

app.get('/api/applications', adminAuth, (req, res) => {
  res.json(getApplications());
});

app.post('/api/applications', publicWriteLimiter, optionalUserAuth, (req, res) => {
  const user = req.userId ? getUserById(req.userId) : null;
  const { projectType, message, name, email } = req.body;

  if (!projectType || !message) {
    return res.status(400).json({ error: 'Project type and message are required.' });
  }

  if (!user && (!name || !email)) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const application = createApplication({
    ...req.body,
    name: user?.name || name || 'Anonymous applicant',
    email: user?.email || email || '',
    ...(user ? { userId: req.userId } : {})
  });

  const subject = 'New project application available';
  const notificationText = `A new project application has been submitted by ${application.name}. Check the admin dashboard for details.`;
  getUsers().filter((candidate) => candidate.role === 'creative').forEach((creative) => {
    createNotification(creative.id, notificationText, 'new-project');
    console.log(`[email] To: ${creative.email} | Subject: ${subject} | Message: ${notificationText}`);
  });

  res.status(201).json({ success: true, message: 'Application received', application });
});

app.post('/api/user/projects', userAuth, upload.single('media'), async (req, res) => {
  const user = getUserById(req.userId);
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const projectCount = Math.max(1, Math.floor(Number(req.body.projectCount || 1)));
  const budget = Math.max(0, Number(req.body.budget || 0));
  const minimumBudget = projectCount * 800;
  if (!user || user.role !== 'customer') return res.status(403).json({ error: 'Only customers can post projects.' });
  if (!title || !description) return res.status(400).json({ error: 'Project title and description are required.' });
  if (!Number.isFinite(budget) || budget < minimumBudget) return res.status(400).json({ error: `Total budget must be at least NGN ${minimumBudget.toLocaleString()} for ${projectCount} project${projectCount === 1 ? '' : 's'}.` });
  if (Number(user.balance || 0) < budget) return res.status(400).json({ error: `Insufficient balance. Your balance is NGN ${Number(user.balance || 0).toLocaleString()}, but this project requires NGN ${budget.toLocaleString()}.` });

  const amountPerProject = Number((budget / projectCount).toFixed(2));
  const project = createApplication({
    userId: user.id,
    type: 'project',
    status: 'open',
    projectType: title,
    title,
    description,
    message: description,
    projectCount,
    budget,
    amountPerProject,
    mediaName: req.file?.originalname || '',
    mediaFileName: req.file?.filename || '',
    mediaUrl: '',
    mediaType: req.file?.mimetype || '',
    mediaSize: req.file?.size || 0,
    name: user.name,
    email: user.email
  });
  const creatives = getUsers().filter((candidate) => candidate.role === 'creative');
  creatives.forEach((creative) => createNotification(creative.id, `${user.name} posted a project: ${title}.`, 'new-project'));
  await Promise.all(creatives.filter((creative) => creative.email).map((creative) => sendEmail({ to: creative.email, subject: 'New project available on Pawapix', text: `${user.name} posted a project available for you to apply to: ${title}.` })));
  res.status(201).json({ success: true, project });
});

app.get('/api/user/projects/:id/media', userAuth, (req, res) => {
  const project = getApplicationById(req.params.id);
  if (!project || project.type !== 'project' || !project.mediaFileName) return res.status(404).json({ error: 'Project media not found.' });
  const isOwner = project.userId === req.userId;
  const isAssignedCreative = getApplications().some((application) => application.type === 'creative-application' && application.projectId === project.id && application.applicantCreativeId === req.userId);
  if (!isOwner && !isAssignedCreative) return res.status(403).json({ error: 'You do not have access to this project media.' });
  const filePath = path.join(uploadDir, path.basename(project.mediaFileName));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Stored project media is unavailable.' });
  res.sendFile(filePath);
});

app.post('/api/user/projects/:id/apply', userAuth, async (req, res) => {
  const creative = getUserById(req.userId);
  const project = getApplicationById(req.params.id);
  if (!creative || creative.role !== 'creative') return res.status(403).json({ error: 'Only creatives can apply to projects.' });
  if (!project || project.type !== 'project' || !['open', 'received'].includes(project.status)) return res.status(404).json({ error: 'Project is no longer available.' });
  if (project.userId === creative.id) return res.status(400).json({ error: 'You cannot apply to your own project.' });
  if (getApplications().some((item) => item.type === 'creative-application' && item.projectId === project.id && item.applicantCreativeId === creative.id)) return res.status(409).json({ error: 'You have already applied to this project.' });

  const agreedPrice = Math.max(0, Number(req.body.amount || creative.servicePrice || project.amountPerProject || project.budget || 0));
  const application = createApplication({ type: 'creative-application', status: 'applied', projectId: project.id, projectOwnerId: project.userId, applicantCreativeId: creative.id, creativeId: creative.id, creativeUsername: creative.username, agreedPrice, projectTitle: project.title || project.projectType, message: String(req.body.message || '').trim(), name: creative.name, email: creative.email });
  const customer = getUserById(project.userId);
  if (customer) {
    createNotification(customer.id, `${creative.name} (@${creative.username}) applied to your project: ${project.title || project.projectType}.`, 'project-application');
    await sendEmail({ to: customer.email, subject: 'A creative applied to your project', text: `${creative.name} (@${creative.username}) applied to ${project.title || project.projectType}. Review the application in your dashboard.` });
  }
  res.status(201).json({ success: true, application });
});

app.post('/api/user/projects/:id/accept', userAuth, async (req, res) => {
  const customer = getUserById(req.userId);
  const application = getApplicationById(req.params.id);
  if (!customer || customer.role !== 'customer') return res.status(403).json({ error: 'Only customers can accept applications.' });
  if (!application || application.type !== 'creative-application' || application.projectOwnerId !== customer.id || application.status !== 'applied') return res.status(404).json({ error: 'Application is no longer available.' });
  const project = getApplicationById(application.projectId);
  const creative = getUserById(application.applicantCreativeId);
  if (!project || !creative) return res.status(404).json({ error: 'Project or creative could not be found.' });

  const agreedPrice = Math.max(0, Number(application.agreedPrice || creative.servicePrice || project.budget || 0));
  updateApplicationStatus(application.id, 'accepted', { creativeId: creative.id, applicantCreativeId: creative.id, creativeUsername: creative.username, agreedPrice, acceptedAt: new Date().toISOString() });
  updateApplicationStatus(project.id, 'accepted', { creativeId: creative.id, creativeUsername: creative.username, agreedPrice, acceptedAt: new Date().toISOString() });
  getApplications().filter((item) => item.type === 'creative-application' && item.projectId === project.id && item.id !== application.id && item.status === 'applied').forEach((other) => updateApplicationStatus(other.id, 'declined'));
  createNotification(creative.id, `${customer.name} accepted your application for ${project.title || project.projectType}. Send the project through Work Cloud.`, 'application-accepted');
  await sendEmail({ to: creative.email, subject: 'Your project application was accepted', text: `${customer.name} accepted your application for ${project.title || project.projectType}. You can now exchange project files in Work Cloud.` });
  res.json({ success: true, project, application: { ...application, status: 'accepted', creativeUsername: creative.username, agreedPrice } });
});

app.get('/api/contacts', adminAuth, (req, res) => {
  res.json(getContacts());
});

app.post('/api/contact', publicWriteLimiter, (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const contact = createContact(req.body);
  res.status(201).json({ success: true, message: 'Contact message received', contact });
});

app.post('/api/inquiries', publicWriteLimiter, (req, res) => {
  const { name, email, message, gigId } = req.body;
  if (!name || !email || !message || !gigId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const inquiry = createContact({ name, email, message, gigId, type: 'inquiry' });
  res.status(201).json({ success: true, message: 'Inquiry received', inquiry });
});

app.post('/api/signup', authLimiter, async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  const requestedRole = (req.body.role || 'customer').trim();
  if (!['customer', 'creative'].includes(requestedRole)) {
    return res.status(400).json({ error: 'Invalid account role.' });
  }
  const role = requestedRole;
  const specialty = String(req.body.specialty || '').trim();
  const location = String(req.body.location || 'Remote').trim();

  if (!name || !email || !password || !username) {
    return res.status(400).json({ error: 'Name, email, username, and password are required.' });
  }

  const existingEmail = getUserByEmail(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  const existingUsername = getUserByUsername(username);
  if (existingUsername) {
    return res.status(409).json({ error: 'Username already in use.' });
  }

  const user = createUser({ name, email, username, password, role, specialty, location });
  if (!user) {
    return res.status(409).json({ error: 'Email or username is already registered.' });
  }
  const token = createUserToken(user.id);
  USER_TOKENS.set(token, user.id);
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/?auth=login`;
  const safeName = escapeHtml(user.name);
  sendEmail({
    to: user.email,
    subject: 'Welcome to Pawapix',
    text: `Welcome to Pawapix, ${user.name}!\n\nWelcomeTo Pawapix\n\nYour ${user.role === 'creative' ? 'creative' : 'user'} account has been created successfully. Your username is @${user.username}.\n\nGet started: ${loginUrl}\n\nIf you have any questions, we are always happy to help.\n\nCheers,\nThe Pawapix Team`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#202b3d"><div style="height:176px;background:#ff9f1c"></div><main style="width:min(546px,calc(100% - 32px));margin:-84px auto 0;position:relative"><section style="background:#fff;border-radius:8px;padding:42px 34px 52px;box-shadow:0 8px 24px rgba(32,43,61,.08)"><div style="text-align:center;font-size:46px;font-weight:700;margin-bottom:18px">Welcome!</div><p style="font-size:20px;line-height:1.5;color:#596276;margin:0 0 30px">We’re excited to have you create and work with us.<br>Welcome onboard.</p><div style="text-align:center;margin:0 0 34px"><a href="${loginUrl}" style="display:inline-block;background:#ff9f1c;color:#fff;text-decoration:none;font-size:22px;font-weight:700;padding:16px 64px;border-radius:7px">Get Started</a></div><p style="font-size:20px;line-height:1.5;color:#596276;margin:0 0 26px">Hi ${safeName}, if you have any questions, just reach out. We’re always happy to help out.</p><p style="font-size:20px;line-height:1.5;color:#596276;margin:0">Cheers,<br>The Pawapix Team</p></section><section style="margin-top:22px;background:#fff1dc;border-radius:8px;padding:25px;text-align:center"><strong style="display:block;font-size:20px;margin-bottom:8px">Need more help?</strong><a href="mailto:${escapeHtml(ADMIN_EMAIL)}" style="color:#f08d00;font-size:20px;font-weight:700">We’re here, ready to talk.</a></section><nav style="padding:28px 6px 18px;font-size:15px"><a href="${loginUrl}" style="color:#202b3d;font-weight:700">Dashboard</a><span style="padding:0 10px">·</span><a href="${loginUrl}" style="color:#202b3d;font-weight:700">Billing</a><span style="padding:0 10px">·</span><a href="mailto:${escapeHtml(ADMIN_EMAIL)}" style="color:#202b3d;font-weight:700">Help</a></nav><p style="padding:0 6px;color:#596276;font-size:13px;line-height:1.6">You received this email because you just signed up for a new account.</p><p style="padding:0 6px 24px;font-weight:700">Pawapix</p></main></body></html>`
  }).catch((error) => console.error('[email] Welcome message failed:', error.message));
  res.status(201).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, username: user.username, nationalId: user.nationalId, role: user.role, balance: Number(user.balance || 0), profilePicUrl: user.profilePicUrl || '', specialty: user.specialty || '', location: user.location || 'Remote', servicePrice: Number(user.servicePrice || 0), payoutDetails: user.role === 'creative' ? user.payoutDetails || {} : undefined } });
});

app.post('/api/login', authLimiter, (req, res) => {
  const identifier = (req.body.identifier || req.body.email || req.body.username || '').trim();
  const normalizedIdentifier = identifier.toLowerCase();
  const normalizedUsername = normalizedIdentifier.replace(/^@+/, '');
  const password = String(req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username or email and password are required.' });
  }

  const user = getUserByEmail(normalizedIdentifier) || getUserByUsername(normalizedUsername) || getUserByName(normalizedIdentifier);
  if (!verifyUserPassword(user, password)) {
    return res.status(401).json({ error: 'Incorrect Login Details' });
  }

  const token = createUserToken(user.id);
  USER_TOKENS.set(token, user.id);

  res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, username: user.username, nationalId: user.nationalId, role: user.role, balance: Number(user.balance || 0), specialty: user.specialty || '', location: user.location || 'Remote', servicePrice: Number(user.servicePrice || 0), profilePicUrl: user.profilePicUrl || '', payoutDetails: user.role === 'creative' ? user.payoutDetails || {} : undefined } });
});

app.post('/api/password/forgot', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = getUserByEmail(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    PASSWORD_RESET_TOKENS.set(token, { userId: user.id, expiresAt: Date.now() + 50 * 1000 });
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/?resetToken=${token}`;
    await sendEmail({ to: user.email, subject: 'Reset your Pawapix password', text: `Use this link to reset your Pawapix password within 50 seconds: ${resetUrl}` });
  }
  res.json({ success: true, message: 'If an account exists for that email, a password reset link has been sent.' });
});

app.post('/api/password/reset', authLimiter, (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '').trim();
  const reset = PASSWORD_RESET_TOKENS.get(token);
  if (!reset || reset.expiresAt < Date.now()) return res.status(400).json({ error: 'This password reset link is invalid or expired.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const user = updateUserPassword(reset.userId, password);
  PASSWORD_RESET_TOKENS.delete(token);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

app.get('/api/user/me', userAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, username: user.username, nationalId: user.nationalId, role: user.role, balance: Number(user.balance || 0), profilePicUrl: user.profilePicUrl || '', specialty: user.specialty || '', location: user.location || 'Remote', servicePrice: Number(user.servicePrice || 0) } });
});

app.patch('/api/user/profile', userAuth, upload.single('profilePic'), (req, res) => {
  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.username !== undefined) updates.username = req.body.username;
  if (req.userId && getUserById(req.userId)?.role === 'creative') {
    if (req.body.specialty !== undefined) updates.specialty = req.body.specialty;
    if (req.body.location !== undefined) updates.location = req.body.location;
    if (req.body.servicePrice !== undefined) updates.servicePrice = req.body.servicePrice;
    if (req.body.bankName !== undefined || req.body.accountName !== undefined || req.body.accountNumber !== undefined) {
      updates.payoutDetails = { bankName: req.body.bankName, accountName: req.body.accountName, accountNumber: req.body.accountNumber };
    }
  }
  if (req.file) updates.profilePicUrl = `/uploads/${req.file.filename}`;

  if (updates.name) {
    const existingName = getUserByName(updates.name);
    if (existingName && existingName.id !== req.userId) {
      return res.status(409).json({ error: 'Username already in use.' });
    }
  }
  if (updates.username && getUserByUsername(updates.username)?.id !== req.userId) {
    return res.status(409).json({ error: 'Username already in use.' });
  }

  const user = updateUserProfile(req.userId, updates);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, username: user.username, nationalId: user.nationalId, role: user.role, balance: Number(user.balance || 0), profilePicUrl: user.profilePicUrl || '', specialty: user.specialty || '', location: user.location || 'Remote', servicePrice: Number(user.servicePrice || 0), payoutDetails: user.role === 'creative' ? { bankName: user.payoutDetails?.bankName || '', accountName: user.payoutDetails?.accountName || '', accountNumber: user.payoutDetails?.accountNumber || '' } : undefined } });
});

app.get('/api/user/notifications', userAuth, (req, res) => {
  const notifications = getNotificationsByUserId(req.userId);
  res.json({ success: true, notifications });
});

app.get('/api/chat/session', userAuth, (req, res) => {
  res.json({ adminPublicKey: getChatKey('admin'), userPublicKey: getChatKey(req.userId), messages: getChatMessages(req.userId) });
});

app.put('/api/chat/key', userAuth, (req, res) => {
  const key = saveChatKey(req.userId, req.body.publicKey);
  if (!key) return res.status(400).json({ error: 'A valid public key is required.' });
  res.json({ success: true, publicKey: key });
});

app.post('/api/chat/messages', userAuth, (req, res) => {
  const { ciphertext, iv } = req.body;
  if (!ciphertext || !iv) return res.status(400).json({ error: 'Encrypted message data is required.' });
  res.status(201).json({ success: true, message: createChatMessage(req.userId, 'user', String(ciphertext), String(iv)) });
});

app.get('/api/user/cloud', userAuth, (req, res) => {
  const cloud = getCloudData(req.userId);
  const signFile = (file) => ({ ...file, fileUrl: createSignedFileUrl(file.fileUrl, req.userId) });
  res.json({ ...cloud, files: cloud.files.map(signFile), sent: cloud.sent, received: cloud.received.map((transfer) => ({ ...transfer, files: transfer.files.map(signFile) })) });
});

app.get('/api/user/cloud/files/:id/download', userAuth, (req, res) => {
  const file = getCloudFileById(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  const cloud = getCloudData(req.userId);
  const canDownload = cloud.files.some((item) => item.id === file.id) || cloud.received.some((transfer) => transfer.files.some((item) => item.id === file.id));
  if (!canDownload) return res.status(403).json({ error: 'You do not have access to this file.' });
  const filePath = path.join(uploadDir, path.basename(file.fileUrl));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Stored file is unavailable.' });
  res.download(filePath, file.fileName);
});

app.post('/api/user/cloud/transfers/:id/download', userAuth, async (req, res) => {
  const result = processProjectDownload(req.params.id, req.userId);
  if (result.error) return res.status(400).json({ error: result.error });

  const file = getCloudFileById(Number(req.body?.fileId || 0));
  if (file) {
    const filePath = path.join(uploadDir, path.basename(file.fileUrl));
    if (fs.existsSync(filePath)) {
      res.download(filePath, file.fileName);
      return;
    }
  }

  const transfer = result.transfer;
  res.json({ success: true, transfer, balance: result.customer.balance, amount: result.amount });
});

app.post('/api/user/cloud/transfers/:id/complain', userAuth, (req, res) => {
  const result = flagProjectComplaint(req.params.id, req.userId, req.body?.message || '');
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ success: true, transfer: result.transfer });
});

app.post('/api/user/cloud/transfers/:id/resolve-complaint', userAuth, (req, res) => {
  const result = resolveProjectComplaint(req.params.id, req.userId);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ success: true, transfer: result.transfer });
});

app.get('/api/user/search', userAuth, (req, res) => {
  const query = String(req.query.username || '').trim().replace(/^@+/, '').toLowerCase();
  const matches = getUsers().filter((candidate) => candidate.id !== req.userId && candidate.username?.replace(/^@+/, '').toLowerCase().includes(query)).slice(0, 8).map(({ id, name, username, role }) => ({ id, name, username, role }));
  res.json(matches);
});

app.post('/api/user/cloud/files', userAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please choose a file to upload.' });
  const file = createCloudFile({ ownerId: req.userId, fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, fileType: req.file.mimetype, size: req.file.size });
  res.status(201).json({ success: true, file });
});

app.post('/api/user/cloud/transfers', userAuth, async (req, res) => {
  const sender = getUserById(req.userId);
  const agreedAmount = Number(req.body.agreedAmount || 0);
  const isEligible = canSendCloudTransfer(sender, agreedAmount);
  if (!sender || !isEligible) {
    if (sender?.role === 'customer') {
      return res.status(400).json({ error: 'You need enough balance in your account to send this project.' });
    }
    return res.status(400).json({ error: 'Unable to send this project.' });
  }
  const transfer = createCloudTransfer(req.userId, req.body.recipientUsername, Array.isArray(req.body.fileIds) ? req.body.fileIds : [], req.body.message, req.body.agreedAmount, req.body.projectId);
  if (!transfer) return res.status(400).json({ error: 'Recipient or selected files could not be found.' });
  const senderUser = getUserById(req.userId);
  const recipientUser = getUserById(transfer.recipientId);
  createNotification(transfer.recipientId, `${senderUser?.name || 'A user'} sent you ${transfer.fileNames.length} file(s) in Work Cloud.`, 'work-received');
  if (senderUser?.role === 'creative' && recipientUser?.email) {
    await sendEmail({ to: recipientUser.email, subject: 'Your Project has been submitted to your dashboard', text: `Your Project has been submitted to your dashboard by ${senderUser.name}. Agreed amount: NGN ${Number(transfer.agreedAmount || 0).toLocaleString()}.` });
  }
  if (senderUser?.role === 'customer' && recipientUser?.role === 'creative' && recipientUser.email) {
    await sendEmail({ to: recipientUser.email, subject: 'You just received a project on your dashboard', text: `You just received a project on your dashboard from ${senderUser.name}.` });
  }
  res.status(201).json({ success: true, transfer });
});

app.post('/api/user/cloud/transfers/:id/complete', userAuth, async (req, res) => {
  const result = completeCloudTransfer(req.params.id, req.userId);
  if (result.error) return res.status(400).json({ error: result.error });
  if (!result.alreadyCompleted) {
    createNotification(result.creative.id, `Project completed. NGN ${result.amount.toLocaleString()} was added to your balance.`, 'project-complete');
    await sendEmail({ to: result.creative.email, subject: 'Project completed', text: `Your project was marked completed. NGN ${result.amount.toLocaleString()} has been added to your balance.` });
    await sendEmail({ to: result.customer.email, subject: 'Withdrawal receipt: project payment completed', text: `Your project completion payment of NGN ${result.amount.toLocaleString()} has been debited from your balance.` });
  }
  res.json({ success: true, transfer: result.transfer, balance: result.customer.balance });
});

app.post('/api/user/contracts', userAuth, (req, res) => {
  const customer = getUserById(req.userId);
  const creative = getUserByUsername(req.body.creativeUsername);
  const projectType = String(req.body.projectType || '').trim();
  const message = String(req.body.message || '').trim();
  if (!customer || customer.role !== 'customer') return res.status(403).json({ error: 'Only customers can contract creatives.' });
  if (!creative || creative.role !== 'creative') return res.status(404).json({ error: 'Creative username not found.' });
  if (!projectType || !message) return res.status(400).json({ error: 'Project type and message are required.' });
  const application = createApplication({ userId: customer.id, creativeId: creative.id, assignedCreativeId: creative.id, creativeUsername: creative.username, projectType, message, agreedPrice: Number(req.body.agreedPrice || creative.servicePrice || 0), name: customer.name, email: customer.email });
  createNotification(creative.id, `${customer.name} contracted you for ${projectType}.`, 'new-project');
  res.status(201).json({ success: true, application });
});

app.post('/api/user/creatives/:id/rating', userAuth, (req, res) => {
  const application = getApplications().find((item) => item.id === Number(req.body.applicationId) && item.userId === req.userId && item.status === 'completed' && Number(item.creativeId || item.assignedCreativeId) === Number(req.params.id));
  if (!application) return res.status(400).json({ error: 'You can rate a creative only after a completed project.' });
  const rating = createRating(req.userId, req.params.id, application.id, req.body.rating, req.body.review);
  if (!rating) return res.status(409).json({ error: 'This completed project has already been rated.' });
  res.status(201).json({ success: true, rating });
});

app.get('/api/user/dashboard', userAuth, (req, res) => {
  const dashboard = getUserDashboardData(req.userId);
  if (!dashboard) {
    return res.status(404).json({ error: 'User not found.' });
  }

  dashboard.projects = dashboard.projects.map((project) => project.mediaUrl ? { ...project, mediaUrl: createSignedFileUrl(project.mediaFileName || project.mediaUrl, req.userId) } : project);
  res.json({ success: true, ...dashboard });
});

app.get('/api/user/withdrawal-settings', userAuth, (req, res) => {
  res.json(getWithdrawalSettings());
});

app.post('/api/user/deposit', userAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  if (user.role !== 'customer') {
    return res.status(403).json({ error: 'Deposits are available to customers only.' });
  }

  return res.status(410).json({ error: 'Direct deposits are disabled. Complete payment through the selected gateway.' });

  const amount = Number(req.body.amount || 0);
  const method = req.body.method || 'stripe';
  const activeGateways = getPaymentConfig().gateways || [];

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid deposit amount.' });
  }
  if (!activeGateways.includes(method)) {
    return res.status(400).json({ error: 'Selected payment gateway is unavailable.' });
  }

  const deposit = createDeposit(req.userId, amount, method);
  if (!deposit) {
    return res.status(400).json({ error: 'Deposit could not be processed.' });
  }

  res.json({ success: true, message: 'Deposit completed.', deposit, balance: deposit.balance });
});

app.get('/api/user/deposit/verify', userAuth, async (req, res) => {
  const reference = String(req.query.reference || '').trim();
  const user = getUserById(req.userId);
  const paymentConfig = getPaymentConfig();
  if (!user || user.role !== 'customer') return res.status(403).json({ error: 'Deposits are available to customers only.' });
  if (!reference) return res.status(400).json({ error: 'A payment reference is required.' });

  const existingDeposit = getState().deposits.find((item) => item.reference === reference && item.userId === req.userId);
  if (existingDeposit) return res.json({ success: true, message: 'Payment already applied.', deposit: existingDeposit, balance: user.balance });

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY || paymentConfig.webhookSecret;
  if (!paystackSecret || !String(paystackSecret).startsWith('sk_')) return res.status(400).json({ error: 'Paystack secret key is not configured.' });

  try {
    const verificationResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${paystackSecret}` } });
    const verification = await verificationResponse.json();
    const transaction = verification.data;
    if (!verificationResponse.ok || !verification.status || transaction?.status !== 'success' || transaction?.currency !== 'NGN') {
      return res.status(400).json({ error: verification.message || 'Payment has not been completed.' });
    }
    if (transaction.customer?.email && transaction.customer.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({ error: 'This payment belongs to a different account.' });
    }

    const deposit = createDeposit(req.userId, Number(transaction.amount || 0) / 100, 'paystack', reference);
    if (!deposit) return res.status(400).json({ error: 'Payment was verified but could not be applied.' });
    res.json({ success: true, message: 'Payment verified and balance updated.', deposit, balance: deposit.balance });
  } catch (error) {
    res.status(502).json({ error: 'Unable to verify the payment right now.' });
  }
});

app.post('/api/user/withdraw', userAuth, async (req, res) => {
  const user = getUserById(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  if (user.role !== 'creative') {
    return res.status(403).json({ error: 'Withdrawals are available to creatives only.' });
  }

  const withdrawalSettings = getWithdrawalSettings();
  if (!withdrawalSettings.enabled || (user.role === 'creative' && !withdrawalSettings.creativesEnabled)) {
    return res.status(403).json({ error: 'Withdrawals are currently unavailable.' });
  }

  const amount = Number(req.body.amount || 0);
  const method = req.body.method || 'bank';
  const payoutDetails = {
    bankName: String(req.body.bankName || '').trim(),
    accountName: String(req.body.accountName || '').trim(),
    accountNumber: String(req.body.accountNumber || '').replace(/\D/g, '')
  };

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid withdrawal amount.' });
  }

  if (!payoutDetails.bankName || !payoutDetails.accountName || !/^\d{10}$/.test(payoutDetails.accountNumber)) {
    return res.status(400).json({ error: 'Bank name, account name, and a valid 10-digit account number are required.' });
  }

  const withdrawal = createWithdrawal(req.userId, amount, 'bank transfer', payoutDetails);
  if (!withdrawal) {
    return res.status(400).json({ error: 'Withdrawal could not be processed. Check the amount, limits, and balance.' });
  }

  createNotification(req.userId, `Your withdrawal request for ${withdrawal.amount} is pending review.`, 'withdrawal-submitted');
  await sendEmail({
    to: 'agenezico12@gmail.com',
    subject: 'Pawapix withdrawal placed',
    text: [
      'A creative has placed a withdrawal request.',
      `Creative: ${user.name}`,
      `Username: @${user.username || 'unknown'}`,
      `Amount: NGN ${withdrawal.amount.toLocaleString()}`,
      'Method: Bank transfer',
      `Bank name: ${withdrawal.bankName}`,
      `Account name: ${withdrawal.accountName}`,
      `Account number: ${withdrawal.accountNumberMasked}`,
      'Status: Pending',
      `Withdrawal ID: ${withdrawal.id}`
    ].join('\n')
  });
  await sendEmail({ to: user.email, subject: 'Pawapix withdrawal receipt', text: `Your withdrawal request for NGN ${withdrawal.amount.toLocaleString()} has been placed successfully. Method: bank transfer. Withdrawal ID: ${withdrawal.id}.` });
  res.json({ success: true, message: 'Withdrawal request submitted.', withdrawal, balance: withdrawal.balance });
});

app.post('/api/user/works', userAuth, upload.single('file'), (req, res) => {
  const user = getUserById(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  if (user.role !== 'creative') {
    return res.status(403).json({ error: 'Portfolio uploads are available to creatives only.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please choose a file to upload.' });
  }

  const payload = {
    userId: req.userId,
    title: req.body.title || 'Portfolio upload',
    description: req.body.description || '',
    amount: req.body.amount,
    fileName: req.file.originalname,
    fileUrl: `/uploads/${req.file.filename}`,
    fileType: req.file.mimetype.startsWith('video/') ? 'video' : req.file.mimetype.startsWith('image/') ? 'image' : 'file'
  };

  const work = createWork(payload);
  res.status(201).json({ success: true, work });
});

app.get('/api/admin/users', adminAuth, (req, res) => {
  const users = getUsers().map(({ password, passwordHash, ...rest }) => rest);
  res.json(users);
});

app.get('/api/admin/chat/session/:userId', adminAuth, (req, res) => {
  res.json({ adminPublicKey: getChatKey('admin'), userPublicKey: getChatKey(req.params.userId), messages: getChatMessages(req.params.userId) });
});

app.put('/api/admin/chat/key', adminAuth, (req, res) => {
  const key = saveChatKey('admin', req.body.publicKey);
  if (!key) return res.status(400).json({ error: 'A valid public key is required.' });
  res.json({ success: true, publicKey: key });
});

app.post('/api/admin/chat/messages/:userId', adminAuth, (req, res) => {
  if (!getUserById(req.params.userId)) return res.status(404).json({ error: 'User not found.' });
  const { ciphertext, iv } = req.body;
  if (!ciphertext || !iv) return res.status(400).json({ error: 'Encrypted message data is required.' });
  res.status(201).json({ success: true, message: createChatMessage(req.params.userId, 'admin', String(ciphertext), String(iv)) });
});

app.put('/api/admin/users/:id', adminAuth, (req, res) => {
  const result = updateAdminUser(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: 'User not found' });
  if (result.error) return res.status(409).json({ error: result.error });
  const { password, passwordHash, ...safeUser } = result;
  res.json({ success: true, user: safeUser });
});

app.post('/api/admin/messages', adminAuth, async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' });
  const recipients = String(req.body.userId) === 'all'
    ? getUsers().filter((user) => user.email)
    : [getUserById(req.body.userId)].filter(Boolean);
  if (!recipients.length) return res.status(404).json({ error: 'No email recipients found.' });
  const results = await Promise.all(recipients.map((user) => sendEmail({ to: user.email, subject, text: message })));
  const deliveredCount = results.filter((result) => result.delivered).length;
  const configured = results.some((result) => result.configured);
  res.json({ success: true, delivered: deliveredCount > 0, configured, recipientCount: recipients.length, deliveredCount, message: deliveredCount === recipients.length ? `Email sent to ${deliveredCount} user${deliveredCount === 1 ? '' : 's'}.` : configured ? `Email delivered to ${deliveredCount} of ${recipients.length} users.` : 'Message accepted, but SMTP is not configured. Check the server email settings.' });
});

app.delete('/api/admin/users/:id', adminAuth, (req, res) => {
  const removed = deleteUser(req.params.id);
  if (!removed) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, message: 'User deleted' });
});

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

app.get('/api/plans', (req, res) => {
  res.json(getPlans());
});

app.get('/api/plans/:id', (req, res) => {
  const plan = getPlanById(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

app.get('/api/payment-config', (req, res) => {
  const paymentConfig = getPaymentConfig();
  res.json({
    enabled: Boolean(paymentConfig.enabled),
    gateway: paymentConfig.gateway,
    gateways: paymentConfig.gateways || [],
    methods: paymentConfig.methods || [],
    currencies: paymentConfig.currencies || [],
    minimumPayment: Number(paymentConfig.minimumPayment || 0)
  });
});

app.get('/api/site-settings', (req, res) => {
  const settings = getSiteSettings();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ socialLinks: settings.socialLinks, testimonials: settings.testimonials || [], supportContacts: settings.supportContacts || {}, legalPages: settings.legalPages || {} });
});

app.post('/api/checkout', publicWriteLimiter, async (req, res) => {
  const { planId, serviceId, customerEmail, gateway, returnUrl } = req.body;
  const plan = getPlanById(planId);
  const service = getGigById(serviceId);
  const paymentConfig = getPaymentConfig();

  if (!plan && !service) return res.status(404).json({ error: 'Plan or service not found' });
  if (gateway && !(paymentConfig.gateways || []).includes(gateway)) return res.status(400).json({ error: 'Selected payment gateway is unavailable.' });

  const selectedGateway = gateway || plan?.paymentGateway || paymentConfig.gateway;
  const gatewayDefaults = {
    stripe: process.env.STRIPE_CHECKOUT_URL,
    paypal: process.env.PAYPAL_CHECKOUT_URL,
    paystack: process.env.PAYSTACK_CHECKOUT_URL,
    flutterwave: process.env.FLUTTERWAVE_CHECKOUT_URL
  };
  const configuredRedirect = paymentConfig.checkoutUrls?.[selectedGateway];
  const baseRedirectUrl = configuredRedirect || gatewayDefaults[selectedGateway];
  if (!baseRedirectUrl && selectedGateway !== 'paystack') return res.status(400).json({ error: `The ${selectedGateway} payment gateway is not configured. Add its real checkout URL to the server environment.` });

  if (selectedGateway === 'paystack') {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || paymentConfig.webhookSecret;
    if (!paystackSecret || !String(paystackSecret).startsWith('sk_')) {
      return res.status(400).json({ error: 'Paystack is enabled but its secret key is not configured.' });
    }
    if (!plan || !customerEmail) return res.status(400).json({ error: 'A plan and customer email are required for Paystack checkout.' });

    try {
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          amount: Math.round(Number(plan.price || 0) * 100),
          currency: 'NGN',
          callback_url: returnUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/?payment=success&planId=${plan.id}`,
          metadata: { planId: plan.id, planName: plan.name }
        })
      });
      const paystackData = await paystackResponse.json();
      if (!paystackResponse.ok || !paystackData.status || !paystackData.data?.authorization_url) {
        return res.status(502).json({ error: paystackData.message || 'Paystack could not initialize the payment.' });
      }

      return res.json({
        success: true,
        message: 'Paystack checkout session prepared',
        checkout: { plan, gateway: selectedGateway, enabled: paymentConfig.enabled, currencies: ['NGN'], selectedGateway, redirectUrl: paystackData.data.authorization_url, reference: paystackData.data.reference, customerEmail, status: 'pending' }
      });
    } catch (error) {
      return res.status(502).json({ error: 'Unable to connect to Paystack. Please try again.' });
    }
  }

  const redirect = new URL(baseRedirectUrl);
  if (plan) {
    redirect.searchParams.set('plan', plan.name);
    redirect.searchParams.set('amount', String(plan.price));
    redirect.searchParams.set('currency', 'NGN');
    redirect.searchParams.set('interval', plan.interval || 'month');
  }
  if (customerEmail) redirect.searchParams.set('customer_email', customerEmail);
  if (returnUrl) redirect.searchParams.set('return_url', returnUrl);
  const redirectUrl = redirect.toString();

  res.json({
    success: true,
    message: 'Checkout session prepared',
    checkout: {
      plan,
      service,
      gateway: selectedGateway,
      enabled: paymentConfig.enabled,
      currencies: paymentConfig.currencies || [],
      commissionRate: Number(paymentConfig.commissionRate || 0),
      minimumPayment: Number(paymentConfig.minimumPayment || 0),
      selectedGateway,
      redirectUrl,
      customerEmail,
      status: 'pending'
    }
  });
});

app.get('/api/admin/payment-gateways', adminAuth, (req, res) => {
  const paymentConfig = getPaymentConfig();
  res.json({
    success: true,
    gateways: Array.isArray(paymentConfig.gateways) && paymentConfig.gateways.length ? paymentConfig.gateways : ['stripe', 'paypal']
  });
});

app.post('/api/admin/login', adminLimiter, (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').toLowerCase();
  const validAdmin =
    (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) ||
    (!isProduction && normalizedEmail === LEGACY_ADMIN_EMAIL && password === ADMIN_PASSWORD) ||
    (normalizedEmail === specialAdminCredentials.email && password === specialAdminCredentials.password);

  if (!validAdmin) {
    return res.status(401).json({ error: 'Incorrect Login Details' });
  }

  const token = createAdminToken(normalizedEmail);
  ADMIN_TOKENS.add(token);
  res.json({ success: true, token, admin: { email: normalizedEmail } });
});

app.get('/api/admin/me', adminAuth, (req, res) => {
  res.json({ success: true, admin: { email: ADMIN_EMAIL } });
});

app.get('/api/admin/dashboard', adminAuth, (req, res) => {
  res.json({
    success: true,
    stats: getStats(),
    paymentConfig: getSafePaymentConfig(),
    plans: getPlans()
  });
});

app.get('/api/admin/gigs', adminAuth, (req, res) => {
  res.json(getGigs());
});

app.post('/api/admin/gigs', adminAuth, (req, res) => {
  const gig = createGig(req.body);
  res.status(201).json(gig);
});

app.put('/api/admin/gigs/:id', adminAuth, (req, res) => {
  const updated = updateGig(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Gig not found' });
  res.json(updated);
});

app.delete('/api/admin/gigs/:id', adminAuth, (req, res) => {
  const removed = deleteGig(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Gig not found' });
  res.json({ success: true, message: 'Gig deleted' });
});

app.get('/api/admin/creatives', adminAuth, (req, res) => {
  res.json(getCreatives());
});

app.post('/api/admin/creatives', adminAuth, (req, res) => {
  const creative = createCreative(req.body);
  res.status(201).json(creative);
});

app.put('/api/admin/creatives/:id', adminAuth, (req, res) => {
  const updated = updateCreative(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Creative not found' });
  res.json(updated);
});

app.delete('/api/admin/creatives/:id', adminAuth, (req, res) => {
  const removed = deleteCreative(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Creative not found' });
  res.json({ success: true, message: 'Creative deleted' });
});

app.get('/api/admin/applications', adminAuth, (req, res) => {
  res.json(getApplications());
});

app.put('/api/admin/applications/:id/complete', adminAuth, (req, res) => {
  const application = updateApplicationStatus(req.params.id, 'completed', req.body);
  if (!application) {
    return res.status(404).json({ error: 'Application not found.' });
  }

  createNotification(application.userId, `Your project application has been completed.`, 'project-complete');
  const user = getUserById(application.userId);
  if (user) {
    console.log(`[email] To: ${user.email} | Subject: Project Completed | Message: Your project has been marked complete.`);
  }

  res.json({ success: true, application });
});

app.get('/api/admin/contacts', adminAuth, (req, res) => {
  res.json(getContacts());
});

app.get('/api/admin/finance', adminAuth, (req, res) => {
  res.json(getFinanceData());
});

app.get('/api/admin/cloud', adminAuth, (req, res) => {
  res.json(getCloudStats());
});

app.get('/api/admin/withdrawal-settings', adminAuth, (req, res) => {
  res.json(getWithdrawalSettings());
});

app.put('/api/admin/withdrawal-settings', adminAuth, (req, res) => {
  res.json(updateWithdrawalSettings(req.body));
});

app.put('/api/admin/withdrawals/:id/status', adminAuth, (req, res) => {
  const allowedStatuses = ['pending', 'under-review', 'approved', 'processing', 'completed', 'rejected', 'failed', 'cancelled'];
  if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ error: 'Invalid withdrawal status.' });
  const withdrawal = updateWithdrawalStatus(req.params.id, req.body.status, req.body);
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
  createNotification(withdrawal.userId, `Your withdrawal is now ${withdrawal.status}.`, 'withdrawal-status');
  res.json({ success: true, withdrawal });
});

app.get('/api/admin/plans', adminAuth, (req, res) => {
  res.json(getPlans());
});

app.post('/api/admin/plans', adminAuth, (req, res) => {
  const plan = createPlan(req.body);
  res.status(201).json(plan);
});

app.put('/api/admin/plans/:id', adminAuth, (req, res) => {
  const updated = updatePlan(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Plan not found' });
  res.json(updated);
});

app.delete('/api/admin/plans/:id', adminAuth, (req, res) => {
  const removed = deletePlan(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Plan not found' });
  res.json({ success: true, message: 'Plan deleted' });
});

app.get('/api/admin/payment', adminAuth, (req, res) => {
  res.json(getSafePaymentConfig());
});

app.get('/api/admin/site-settings', adminAuth, (req, res) => {
  res.json(getSiteSettings());
});

app.put('/api/admin/site-settings', adminAuth, (req, res) => {
  res.json(updateSiteSettings(req.body));
});

app.put('/api/admin/payment', adminAuth, (req, res) => {
  const updated = updatePaymentConfig(req.body);
  res.json(getSafePaymentConfig(updated));
});

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir, { index: 'index.html' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: status === 413 ? 'Uploaded file is too large.' : 'Upload could not be processed.' });
  }
  if (err.message === 'Unsupported file type.') {
    return res.status(415).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Pawapix server listening on http://localhost:${port}`);
});
