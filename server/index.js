import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const uploadDir = path.join(__dirname, 'uploads');
const DEFAULT_USERS_TABLES = ['users', 'Users', 'crm-users', 'sales-crm-users'];
const USERS_TABLE_CANDIDATES = Array.from(new Set([process.env.DYNAMODB_USERS_TABLE, ...DEFAULT_USERS_TABLES].filter(Boolean)));
const CONTACTS_TABLE = process.env.DYNAMODB_CONTACTS_TABLE || 'contacts';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
};
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}
AWS.config.update(awsConfig);
const dynamodb = new AWS.DynamoDB.DocumentClient();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// ── User helpers ──────────────────────────────────────────────

const normalizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return { ...rest, phoneNumber: rest.phoneNumber || rest.phone };
};

const getUserByPhone = async (phoneValue) => {
  for (const tableName of USERS_TABLE_CANDIDATES) {
    try {
      const result = await dynamodb.scan({
        TableName: tableName,
        FilterExpression: 'phone = :phone OR phoneNumber = :phone',
        ExpressionAttributeValues: { ':phone': phoneValue },
      }).promise();
      return result.Items?.[0] || null;
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') throw error;
    }
  }
  throw new Error(`Unable to access DynamoDB users table. Checked: ${USERS_TABLE_CANDIDATES.join(', ')}. Set DYNAMODB_USERS_TABLE to the exact table name in your AWS region.`);
};

const getAllUsers = async () => {
  for (const tableName of USERS_TABLE_CANDIDATES) {
    try {
      const result = await dynamodb.scan({ TableName: tableName }).promise();
      return result.Items || [];
    } catch (error) {
      if (error.code !== 'ResourceNotFoundException') throw error;
    }
  }
  return [];
};

const putUser = async (user) => {
  await dynamodb.put({ TableName: USERS_TABLE_CANDIDATES[0], Item: user }).promise();
  return user;
};

// ── Password validation ───────────────────────────────────────

const isValidPassword = (pw) => typeof pw === 'string' && pw.length >= 5 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const PASSWORD_ERROR = 'Password must be at least 5 characters and contain both letters and numbers';

// ── Contact DynamoDB helpers ──────────────────────────────────

const getAllContacts = async () => {
  try {
    const result = await dynamodb.scan({ TableName: CONTACTS_TABLE }).promise();
    return result.Items || [];
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') return [];
    throw error;
  }
};

const getContactByPhone = async (phoneNumber) => {
  try {
    const result = await dynamodb.get({ TableName: CONTACTS_TABLE, Key: { phoneNumber: String(phoneNumber) } }).promise();
    return result.Item || null;
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') return null;
    throw error;
  }
};

const putContactsBatch = async (items) => {
  if (!items.length) return;
  const requests = items.map((item) => ({ PutRequest: { Item: item } }));
  for (let i = 0; i < requests.length; i += 25) {
    await dynamodb.batchWrite({
      RequestItems: { [CONTACTS_TABLE]: requests.slice(i, i + 25) },
    }).promise();
  }
};

const updateContactByPhone = async (phoneNumber, updates) => {
  const exprParts = [];
  const exprNames = {};
  const exprValues = {};
  Object.entries(updates).forEach(([key, value], idx) => {
    const nameKey = `#f${idx}`;
    const valKey = `:v${idx}`;
    exprParts.push(`${nameKey} = ${valKey}`);
    exprNames[nameKey] = key;
    exprValues[valKey] = value;
  });
  const result = await dynamodb.update({
    TableName: CONTACTS_TABLE,
    Key: { phoneNumber: String(phoneNumber) },
    UpdateExpression: `SET ${exprParts.join(', ')}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ReturnValues: 'ALL_NEW',
  }).promise();
  return result.Attributes;
};

// ── PDF parser ────────────────────────────────────────────────

const PHONE_RE = /(\d{5}[\s\-]?\d{5})/;

const parsePdfContacts = (text) => {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const phoneMatch = line.match(PHONE_RE);
    if (phoneMatch) {
      const phone = phoneMatch[1].replace(/[\s\-]/g, '');
      const phoneIdx = line.indexOf(phoneMatch[1]);
      const name = line.slice(0, phoneIdx).trim();
      let address = line.slice(phoneIdx + phoneMatch[1].length).trim();
      // If no address on the same line, check the next line (address often follows the phone)
      if (!address && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!PHONE_RE.test(nextLine) && nextLine.length > 5) {
          address = nextLine;
          i++;
        }
      }
      if (name && name.length >= 2 && phone.length === 10) {
        rows.push({ customerName: name, phoneNumber: phone, address: address || '' });
      }
    }
  }
  return rows;
};

// ── Auth middleware ────────────────────────────────────────────

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing token' });
  try {
    const token = authHeader.split('Bearer ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const roleMiddleware = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// ── Routes ────────────────────────────────────────────────────

app.post('/login', async (req, res) => {
  const phoneValue = req.body.phoneNumber || req.body.phone;
  const { password } = req.body;
  if (password && !isValidPassword(password)) return res.status(400).json({ message: PASSWORD_ERROR });
  try {
    const user = await getUserByPhone(phoneValue);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const phoneNumber = user.phoneNumber || user.phone;
    const isHashed = typeof user.password === 'string' && user.password.startsWith('$2');
    const match = isHashed ? await bcrypt.compare(password, user.password) : password === user.password;
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.userId, role: user.role, phoneNumber }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { userId: user.userId, phoneNumber, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.post('/users', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const phoneValue = req.body.phoneNumber || req.body.phone;
  const { password, role = 'SALES', name = '' } = req.body;
  if (!name || !phoneValue || !password) return res.status(400).json({ message: 'Name, phone, and password are required' });
  if (!isValidPassword(password)) return res.status(400).json({ message: PASSWORD_ERROR });
  try {
    const existing = await getUserByPhone(phoneValue);
    if (existing) return res.status(409).json({ message: 'User already exists' });
    const newUser = {
      userId: uuidv4(),
      name,
      phone: phoneValue,
      phoneNumber: phoneValue,
      password: bcrypt.hashSync(password, 10),
      role,
      createdAt: new Date().toISOString(),
    };
    await putUser(newUser);
    res.status(201).json({ user: { userId: newUser.userId, name, phoneNumber: phoneValue, role: newUser.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

app.post('/users/reset-password', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { phone, newPassword } = req.body;
  if (!phone || !newPassword) return res.status(400).json({ message: 'Phone and new password are required' });
  if (!isValidPassword(newPassword)) return res.status(400).json({ message: PASSWORD_ERROR });
  try {
    const user = await getUserByPhone(phone);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = bcrypt.hashSync(newPassword, 10);
    await putUser(user);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

app.get('/users', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users: users.map(normalizeUser) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load users', error: error.message });
  }
});

app.delete('/users/:phone', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const user = await getUserByPhone(req.params.phone);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const phoneKey = user.phone || user.phoneNumber;
    if (phoneKey === req.user.phoneNumber) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    // Unassign all contacts assigned to this user
    const contacts = await getAllContacts();
    const assigned = contacts.filter((c) => c.assignedSalesId === user.userId);
    for (const contact of assigned) {
      await updateContactByPhone(contact.phoneNumber, { assignedSalesId: '' });
    }
    await dynamodb.delete({ TableName: USERS_TABLE_CANDIDATES[0], Key: { phone: phoneKey } }).promise();
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

app.post('/contacts/upload', authMiddleware, roleMiddleware(['ADMIN']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const startTime = Date.now();
    let rows = [];

    if (ext === '.pdf') {
      const parser = new PDFParse({ url: filePath });
      const result = await parser.getText();
      rows = parsePdfContacts(result.text);
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }

    const uniqueRows = [];
    const seenPhones = new Set();
    for (const row of rows) {
      const phone = String(row.phoneNumber || row.PhoneNumber || row.phone || row.Phone || '').trim();
      if (!phone || seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      uniqueRows.push({
        phoneNumber: phone,
        customerName: row.customerName || row.CustomerName || row.name || row.Name || 'Unnamed Contact',
        address: String(row.address || row.Address || row.ADDRESS || '').trim(),
        assignedSalesId: '',
        interestedStatus: 'No Response',
        callStatus: 'Need to Call',
        feedback: '',
        uploadedBy: req.user.userId,
        createdAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await putContactsBatch(uniqueRows);
    const extractionTimeMs = Date.now() - startTime;
    res.json({
      message: 'Contacts uploaded successfully',
      contacts: uniqueRows,
      extractedCount: uniqueRows.length,
      extractionTimeMs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to process file', error: error.message });
  }
});

app.get('/contacts', authMiddleware, async (req, res) => {
  try {
    const all = await getAllContacts();
    const filtered = req.user.role === 'ADMIN'
      ? all
      : all.filter((c) => c.assignedSalesId === req.user.userId);
    res.json({ contacts: filtered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load contacts', error: error.message });
  }
});

app.get('/contacts/:phone', authMiddleware, async (req, res) => {
  try {
    const contact = await getContactByPhone(req.params.phone);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    if (req.user.role !== 'ADMIN' && contact.assignedSalesId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ contact });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load contact', error: error.message });
  }
});

app.delete('/contacts/:phone', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const existing = await getContactByPhone(req.params.phone);
    if (!existing) return res.status(404).json({ message: 'Contact not found' });
    await dynamodb.delete({ TableName: CONTACTS_TABLE, Key: { phoneNumber: req.params.phone } }).promise();
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete contact', error: error.message });
  }
});

app.put('/contacts/assign', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  const { phoneNumbers, assignedSalesId } = req.body;
  if (!Array.isArray(phoneNumbers) || !assignedSalesId) return res.status(400).json({ message: 'Invalid request' });
  try {
    for (const phone of phoneNumbers) {
      await updateContactByPhone(phone, { assignedSalesId, updatedAt: new Date().toISOString() });
    }
    res.json({ message: 'Contacts assigned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to assign contacts', error: error.message });
  }
});

app.put('/contacts/:phone', authMiddleware, async (req, res) => {
  try {
    const existing = await getContactByPhone(req.params.phone);
    if (!existing) return res.status(404).json({ message: 'Contact not found' });
    if (req.user.role !== 'ADMIN' && existing.assignedSalesId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { phoneNumber: newPhone, ...updates } = req.body;
    let updated;
    if (newPhone && newPhone !== req.params.phone) {
      if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Only admin can change phone number' });
      const existingNew = await getContactByPhone(newPhone);
      if (existingNew) return res.status(409).json({ message: 'A contact with this phone number already exists' });
      const newItem = { ...existing, ...updates, phoneNumber: newPhone, updatedAt: new Date().toISOString() };
      delete newItem.phoneNumber_key;
      await dynamodb.put({ TableName: CONTACTS_TABLE, Item: newItem }).promise();
      await dynamodb.delete({ TableName: CONTACTS_TABLE, Key: { phoneNumber: req.params.phone } }).promise();
      updated = newItem;
    } else {
      if (updates.phoneNumber) delete updates.phoneNumber;
      updated = await updateContactByPhone(req.params.phone, { ...updates, updatedAt: new Date().toISOString() });
    }
    res.json({ contact: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update contact', error: error.message });
  }
});

app.get('/dashboard', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const [allUsers, allContacts] = await Promise.all([getAllUsers(), getAllContacts()]);
    res.json({
      totalContacts: allContacts.length,
      assignedContacts: allContacts.filter((c) => c.assignedSalesId).length,
      pendingContacts: allContacts.filter((c) => !c.assignedSalesId).length,
      interestedCustomers: allContacts.filter((c) => c.interestedStatus === 'Interested').length,
      notInterestedCustomers: allContacts.filter((c) => c.interestedStatus === 'Not Interested').length,
      followUpCustomers: allContacts.filter((c) => c.interestedStatus === 'Follow Up').length,
      installedCustomers: allContacts.filter((c) => c.interestedStatus === 'Installed').length,
      totalSalesUsers: allUsers.filter((u) => u.role === 'SALES').length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
});

app.post('/feedback', authMiddleware, async (req, res) => {
  const { phoneNumber, feedback } = req.body;
  try {
    const existing = await getContactByPhone(phoneNumber);
    if (!existing) return res.status(404).json({ message: 'Contact not found' });
    if (req.user.role !== 'ADMIN' && existing.assignedSalesId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await updateContactByPhone(phoneNumber, { feedback, updatedAt: new Date().toISOString() });
    res.json({ contact: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save feedback', error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
