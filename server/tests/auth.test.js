const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getState, createUser, createWork, updateApplicationStatus, getUserByEmail, getUserByName, getUserByUsername, getUserById, canSendCloudTransfer, processProjectDownload, completeCloudTransfer, flagProjectComplaint } = require('../data');

const dataStorePath = path.join(__dirname, '..', 'data-store.json');
const usersBackupPath = path.join(__dirname, '..', 'users-backup.json');
const originalDataStore = fs.readFileSync(dataStorePath);
const originalUsersBackup = fs.readFileSync(usersBackupPath);

test.afterEach(() => {
  fs.writeFileSync(dataStorePath, originalDataStore);
  fs.writeFileSync(usersBackupPath, originalUsersBackup);
});

test('auth helpers normalize credentials for signup and login', () => {
  const state = getState();
  const originalUsers = state.users.slice();

  try {
    state.users = [];

    const user = createUser({
      name: '  Alice Example  ',
      email: '  ALICE@example.com  ',
      password: '  secret123  ',
      username: '  alicecraft  ',
      nationalId: '  1234567890  ',
      role: 'customer'
    });

    assert.equal(user.name, 'Alice Example');
    assert.equal(user.email, 'alice@example.com');
    assert.equal(user.password, 'secret123');
    assert.equal(user.username, 'alicecraft');
    assert.equal(user.nationalId, '1234567890');

    const byEmail = getUserByEmail('  alice@example.com  ');
    const byName = getUserByName('  alice example  ');
    const byUsername = getUserByUsername('  ALICECRAFT  ');

    assert.ok(byEmail);
    assert.ok(byName);
    assert.ok(byUsername);
    assert.equal(byEmail.id, user.id);
    assert.equal(byName.id, user.id);
    assert.equal(byUsername.id, user.id);
  } finally {
    state.users = originalUsers;
  }
});

test('project uploads debit the uploader and completion credits the creative counterpart', () => {
  const state = getState();
  const originalUsers = state.users.slice();
  const originalWorks = state.works.slice();
  const originalApplications = state.applications.slice();

  try {
    state.users = [];
    state.works = [];
    state.applications = [];

    const customer = createUser({ name: 'Client User', email: 'client@example.com', password: 'secret', username: 'clientuser', nationalId: '123', role: 'customer', balance: 100 });
    const creative = createUser({ name: 'Creative User', email: 'creative@example.com', password: 'secret', username: 'creativeuser', nationalId: '456', role: 'creative', balance: 50 });
    const alternateCreative = createUser({ name: 'Other Creative', email: 'othercreative@example.com', password: 'secret', username: 'othercreative', nationalId: '789', role: 'creative', balance: 60 });

    const work = createWork({ userId: customer.id, title: 'Brand launch', description: 'Project upload', fileName: 'brief.pdf', fileUrl: '/uploads/brief.pdf', fileType: 'file' });

    assert.ok(work);
    assert.equal(getUserById(customer.id).balance, 100);

    const application = { id: Date.now(), userId: customer.id, status: 'received' };
    state.applications.unshift(application);

    updateApplicationStatus(application.id, 'completed', { creativeId: alternateCreative.id });

    assert.equal(getUserById(customer.id).balance, 80);
    assert.equal(getUserById(creative.id).balance, 50);
    assert.equal(getUserById(alternateCreative.id).balance, 80);
  } finally {
    state.users = originalUsers;
    state.works = originalWorks;
    state.applications = originalApplications;
  }
});

test('creatives can send cloud work without money while customers need enough balance', () => {
  const state = getState();
  const originalUsers = state.users.slice();

  try {
    state.users = [];

    const creative = createUser({
      name: 'Creative Sender',
      email: 'creative-sender@example.com',
      password: 'secret',
      username: 'creativesender',
      nationalId: '9876543210',
      role: 'creative',
      balance: 0
    });
    const customer = createUser({
      name: 'Client Receiver',
      email: 'client-receiver@example.com',
      password: 'secret',
      username: 'clientreceiver',
      nationalId: '6543210987',
      role: 'customer',
      balance: 1200
    });

    assert.equal(canSendCloudTransfer(creative, 0), true);
    assert.equal(canSendCloudTransfer(customer, 0), false);
    assert.equal(canSendCloudTransfer(customer, 250), true);
    assert.equal(canSendCloudTransfer(customer, 1501), false);
  } finally {
    state.users = originalUsers;
  }
});

test('downloading a sent project debits the customer and credits the creative', () => {
  const state = getState();
  const originalUsers = state.users.slice();
  const originalTransfers = state.cloudTransfers.slice();

  try {
    state.users = [];
    state.cloudTransfers = [];

    const creative = createUser({ name: 'Creative', email: 'creative-download@example.com', password: 'secret', username: 'creative-download', nationalId: '1111111111', role: 'creative', balance: 0 });
    const customer = createUser({ name: 'Customer', email: 'customer-download@example.com', password: 'secret', username: 'customer-download', nationalId: '2222222222', role: 'customer', balance: 5000 });

    state.cloudTransfers.unshift({
      id: 201,
      senderId: creative.id,
      recipientId: customer.id,
      recipientUsername: customer.username,
      fileIds: [],
      fileNames: ['pitch-deck.pdf'],
      agreedAmount: 2000,
      status: 'sent',
      createdAt: new Date().toISOString()
    });

    const result = processProjectDownload(201, customer.id);

    assert.equal(result.error, undefined);
    assert.equal(getUserById(customer.id).balance, 3000);
    assert.equal(getUserById(creative.id).balance, 2000);
    assert.equal(result.transfer.status, 'downloaded');

    const repeatedDownload = processProjectDownload(201, customer.id);
    assert.equal(repeatedDownload.alreadyDownloaded, true);
    assert.equal(getUserById(customer.id).balance, 3000);
    assert.equal(getUserById(creative.id).balance, 2000);

    const completion = completeCloudTransfer(201, customer.id);
    assert.equal(completion.alreadyCompleted, true);
    assert.equal(completion.amount, 0);
    assert.equal(getUserById(customer.id).balance, 3000);
    assert.equal(getUserById(creative.id).balance, 2000);
  } finally {
    state.users = originalUsers;
    state.cloudTransfers = originalTransfers;
  }
});

test('a customer complaint flags the project until the creative responds', () => {
  const state = getState();
  const originalUsers = state.users.slice();
  const originalTransfers = state.cloudTransfers.slice();

  try {
    state.users = [];
    state.cloudTransfers = [];

    const creative = createUser({ name: 'Creative', email: 'creative-flag@example.com', password: 'secret', username: 'creative-flag', nationalId: '3333333333', role: 'creative', balance: 0 });
    const customer = createUser({ name: 'Customer', email: 'customer-flag@example.com', password: 'secret', username: 'customer-flag', nationalId: '4444444444', role: 'customer', balance: 10000 });

    state.cloudTransfers.unshift({
      id: 202,
      senderId: creative.id,
      recipientId: customer.id,
      recipientUsername: customer.username,
      fileIds: [],
      fileNames: ['mockup.pdf'],
      agreedAmount: 3000,
      status: 'downloaded',
      createdAt: new Date().toISOString()
    });

    const result = flagProjectComplaint(202, customer.id, 'The layout is not the approved version.');

    assert.equal(result.error, undefined);
    assert.equal(result.transfer.status, 'flagged');
    assert.match(String(result.transfer.customerComplaint || ''), /approved version/i);
    assert.equal(getUserById(creative.id).balance, 0);
  } finally {
    state.users = originalUsers;
    state.cloudTransfers = originalTransfers;
  }
});
