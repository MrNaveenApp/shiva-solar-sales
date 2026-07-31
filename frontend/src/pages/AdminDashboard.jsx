import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Grid, Snackbar, Stack, Tooltip, Typography, TextField, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, InputLabel, Select, FormControl } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

const isValidPassword = (pw) => typeof pw === 'string' && pw.length >= 5 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const PASSWORD_ERROR = 'Password must be at least 5 characters and contain both letters and numbers';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedSales, setSelectedSales] = useState('All');
  const [filterDate, setFilterDate] = useState('All');
  const [newUser, setNewUser] = useState({ name: '', phoneNumber: '', password: '', role: 'SALES' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [activePhone, setActivePhone] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedPhones, setSelectedPhones] = useState([]);
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState({ phoneNumber: '', customerName: '', address: '' });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [extractionInfo, setExtractionInfo] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const loggedUser = JSON.parse(localStorage.getItem('crmUser') || 'null');

  const fetchData = async () => {
    try {
      const [dashboardRes, usersRes, contactsRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/users'),
        api.get('/contacts'),
      ]);
      setDashboard(dashboardRes.data);
      setUsers(usersRes.data.users || []);
      setContacts(contactsRes.data.contacts || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredContacts = contacts
    .filter((contact) => {
      const matchesSearch = `${contact.customerName} ${contact.phoneNumber}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'All' || contact.interestedStatus === filterStatus;
      const matchesSales = selectedSales === 'All'
        || (selectedSales === 'unassigned' && !contact.assignedSalesId)
        || contact.assignedSalesId === selectedSales;
      const created = contact.createdAt || contact.uploadedAt || contact.updatedAt;
      let matchesDate = true;
      if (filterDate !== 'All' && created) {
        const days = filterDate === 'Today' ? 1 : filterDate === 'Last 7 Days' ? 7 : 30;
        matchesDate = new Date(created) >= new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }
      return matchesSearch && matchesStatus && matchesSales && matchesDate;
    })
    .sort((a, b) => new Date(b.createdAt || b.uploadedAt || 0) - new Date(a.createdAt || a.uploadedAt || 0));

  const pagedContacts = filteredContacts.slice((page - 1) * pageSize, page * pageSize);

  const createUser = async () => {
    if (!isValidPassword(newUser.password)) {
      setUserError(PASSWORD_ERROR);
      return;
    }
    setUserError('');
    try {
      const { data } = await api.post('/users', newUser);
      setUsers((prev) => [...prev, data.user]);
      setNewUser({ name: '', phoneNumber: '', password: '', role: 'SALES' });
      setSuccessMsg('User created successfully');
      setSuccessOpen(true);
    } catch (error) {
      setUserError(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setExtractionInfo(null);
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      const { data } = await api.post('/contacts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setExtractionInfo({
        count: data.extractedCount || data.contacts?.length || 0,
        timeMs: data.extractionTimeMs || 0,
      });
      setSuccessMsg('Contacts extracted successfully');
      setSuccessOpen(true);
      setUploadFile(null);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const updateContact = async (phone, updates) => {
    try {
      await api.put(`/contacts/${phone}`, updates);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteContact = async (phone) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/contacts/${phone}`);
      setContacts((prev) => prev.filter((c) => c.phoneNumber !== phone));
      setSuccessMsg('Contact deleted');
      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteSelected = async () => {
    if (!selectedPhones.length || !window.confirm(`Delete ${selectedPhones.length} contacts?`)) return;
    try {
      for (const phone of selectedPhones) {
        await api.delete(`/contacts/${phone}`);
      }
      setSelectedPhones([]);
      fetchData();
      setSuccessMsg('Contacts deleted');
      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const assignContacts = async () => {
    if (!selectedPhones.length || !assignTargetUserId) return;
    await api.put('/contacts/assign', { phoneNumbers: selectedPhones, assignedSalesId: assignTargetUserId });
    setSelectedPhones([]);
    setAssignTargetUserId('');
    fetchData();
    setSuccessMsg('Contacts assigned successfully');
    setSuccessOpen(true);
  };

  const toggleContactSelection = (phone) => {
    setSelectedPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const toggleSelectAll = () => {
    const pagePhones = pagedContacts.map((c) => c.phoneNumber);
    const allSelected = pagePhones.length > 0 && pagePhones.every((p) => selectedPhones.includes(p));
    setSelectedPhones(allSelected ? selectedPhones.filter((p) => !pagePhones.includes(p)) : [...new Set([...selectedPhones, ...pagePhones])]);
  };

  const openEdit = (contact) => {
    setEditContact({ phoneNumber: contact.phoneNumber, customerName: contact.customerName, address: contact.address || '' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      await api.put(`/contacts/${editContact.phoneNumber}`, { customerName: editContact.customerName, address: editContact.address });
      setEditOpen(false);
      fetchData();
      setSuccessMsg('Contact updated');
      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const openReset = (user) => {
    setResetTarget(user);
    setResetPassword('');
    setUserError('');
    setResetOpen(true);
  };

  const saveReset = async () => {
    if (!isValidPassword(resetPassword)) {
      setUserError(PASSWORD_ERROR);
      return;
    }
    setUserError('');
    try {
      await api.post('/users/reset-password', { phone: resetTarget.phoneNumber, newPassword: resetPassword });
      setResetOpen(false);
      setSuccessMsg('Password reset successfully');
      setSuccessOpen(true);
    } catch (error) {
      setUserError(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const deleteUser = async (userItem) => {
    if (!window.confirm(`Delete user ${userItem.name || userItem.phoneNumber}? Their assigned contacts will become unassigned.`)) return;
    try {
      await api.delete(`/users/${userItem.phoneNumber}`);
      setUsers((prev) => prev.filter((u) => u.userId !== userItem.userId));
      setSuccessMsg('User deleted');
      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
      setSuccessMsg(error.response?.data?.message || 'Failed to delete user');
      setSuccessOpen(true);
    }
  };

  const openFeedback = (phone, feedback) => {
    setActivePhone(phone);
    setFeedbackText(feedback || '');
    setFeedbackOpen(true);
  };

  const saveFeedback = async () => {
    try {
      await api.post('/feedback', { phoneNumber: activePhone, feedback: feedbackText });
      setFeedbackOpen(false);
      fetchData();
      setSuccessMsg('Feedback saved');
      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const currentSection = location.pathname === '/admin/contacts'
    ? 'contacts' : location.pathname === '/admin/upload'
      ? 'upload' : location.pathname === '/admin/users'
        ? 'users' : 'dashboard';

  const renderOverview = () => (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Admin Dashboard</Typography>
      <Typography color="text.secondary" gutterBottom>Monitor CRM activity and use the action areas below to manage the business.</Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {dashboard && [
          ['Total Contacts', dashboard.totalContacts],
          ['Assigned Contacts', dashboard.assignedContacts],
          ['Pending Contacts', dashboard.pendingContacts],
          ['Interested Customers', dashboard.interestedCustomers],
          ['Not Interested Customers', dashboard.notInterestedCustomers],
          ['Follow Up Customers', dashboard.followUpCustomers],
          ['Installed Customers', dashboard.installedCustomers],
          ['Total Sales Users', dashboard.totalSalesUsers],
        ].map(([label, value]) => (
          <Grid item xs={12} sm={6} md={3} key={label}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight={700}>{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Contact Management</Typography>
              <Typography color="text.secondary" gutterBottom>Review, filter, and update lead status.</Typography>
              <Button component={Link} to="/admin/contacts" variant="contained" fullWidth>Open Contacts</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Document Upload</Typography>
              <Typography color="text.secondary" gutterBottom>Import leads from documents into the CRM.</Typography>
              <Button component={Link} to="/admin/upload" variant="contained" fullWidth>Go to Upload</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>User Management</Typography>
              <Typography color="text.secondary" gutterBottom>Create and manage sales and admin accounts.</Typography>
              <Button component={Link} to="/admin/users" variant="contained" fullWidth>Manage Users</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderContacts = () => {
    const pagePhones = pagedContacts.map((c) => c.phoneNumber);
    const allPageSelected = pagePhones.length > 0 && pagePhones.every((p) => selectedPhones.includes(p));
    const salesUsers = users.filter((u) => u.role === 'SALES');
    const displayUser = (u) => u.name || u.phoneNumber;
    const getSalesName = (userId) => {
      const u = users.find((userItem) => userItem.userId === userId);
      return u ? displayUser(u) : null;
    };

    return (
      <Box>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>Contacts</Typography>
          <Typography color="text.secondary" gutterBottom>Review and manage all assigned leads in one place.</Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 3 }}>
          <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
          <FormControl sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Interested">Interested</MenuItem>
              <MenuItem value="Not Interested">Not Interested</MenuItem>
              <MenuItem value="Follow Up">Follow Up</MenuItem>
              <MenuItem value="No Response">No Response</MenuItem>
              <MenuItem value="Installed">Installed</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 220 } }}>
            <InputLabel>Assigned Sales</InputLabel>
            <Select value={selectedSales} label="Assigned Sales" onChange={(e) => { setSelectedSales(e.target.value); setPage(1); }}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="unassigned">Unassigned</MenuItem>
              {salesUsers.map((u) => <MenuItem key={u.userId} value={u.userId}>{displayUser(u)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 140 } }}>
            <InputLabel>Created</InputLabel>
            <Select value={filterDate} label="Created" onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Today">Today</MenuItem>
              <MenuItem value="Last 7 Days">Last 7 Days</MenuItem>
              <MenuItem value="Last 30 Days">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 110 } }}>
            <InputLabel>Show</InputLabel>
            <Select value={pageSize} label="Show" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {selectedPhones.length > 0 && (
          <Card sx={{ mt: 2, p: 2, borderRadius: 3, background: '#FFF7ED' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Chip label={`${selectedPhones.length} selected`} color="primary" sx={{ fontWeight: 700 }} />
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Assign to</InputLabel>
                <Select value={assignTargetUserId} label="Assign to" onChange={(e) => setAssignTargetUserId(e.target.value)}>
                  {salesUsers.map((u) => <MenuItem key={u.userId} value={u.userId}>{displayUser(u)}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" disabled={!assignTargetUserId} onClick={assignContacts}>Assign</Button>
              <Button variant="outlined" color="error" onClick={deleteSelected}>Delete Selected</Button>
              <Button variant="outlined" onClick={() => setSelectedPhones([])}>Deselect All</Button>
            </Stack>
          </Card>
        )}

        <Paper sx={{ mt: 2, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allPageSelected} onChange={toggleSelectAll} />
                </TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Sales Person</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Feedback</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedContacts.map((contact) => (
                <TableRow
                  key={contact.phoneNumber}
                  hover
                  selected={selectedPhones.includes(contact.phoneNumber)}
                  onClick={() => navigate(`/contact/${contact.phoneNumber}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedPhones.includes(contact.phoneNumber)} onChange={() => toggleContactSelection(contact.phoneNumber)} />
                  </TableCell>
                  <TableCell>{contact.customerName}</TableCell>
                  <TableCell>{contact.phoneNumber}</TableCell>
                  <TableCell>{contact.address || <Typography variant="body2" color="text.secondary">—</Typography>}</TableCell>
                  <TableCell>{getSalesName(contact.assignedSalesId) || <Chip label="Unassigned" size="small" />}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={contact.interestedStatus} onChange={(e) => updateContact(contact.phoneNumber, { interestedStatus: e.target.value })} size="small" onClick={(e) => e.stopPropagation()}>
                      <MenuItem value="Interested">Interested</MenuItem>
                      <MenuItem value="Not Interested">Not Interested</MenuItem>
                      <MenuItem value="Follow Up">Follow Up</MenuItem>
                      <MenuItem value="No Response">No Response</MenuItem>
                      <MenuItem value="Installed">Installed</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {contact.feedback
                      ? <Tooltip title={contact.feedback} arrow placement="top-start">
                          <Typography variant="body2" sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'default' }}>{contact.feedback}</Typography>
                        </Tooltip>
                      : <Button onClick={() => openFeedback(contact.phoneNumber, '')} size="small">Add</Button>
                    }
                    {contact.feedback && <Button onClick={() => openFeedback(contact.phoneNumber, contact.feedback)} size="small">Edit</Button>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" onClick={() => openEdit(contact)}>Edit</Button>
                      <Button size="small" color="error" onClick={() => deleteContact(contact.phoneNumber)}>Delete</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {pagedContacts.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No contacts found</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Showing {filteredContacts.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredContacts.length)} of {filteredContacts.length}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Typography variant="body2" color="text.secondary">Page {page} of {Math.ceil(filteredContacts.length / pageSize) || 1}</Typography>
          <Button disabled={page * pageSize >= filteredContacts.length} onClick={() => setPage(page + 1)}>Next</Button>
        </Stack>
      </Box>
    );
  };

  const renderUpload = () => (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Document Upload</Typography>
      <Typography color="text.secondary" gutterBottom>Upload contact documents and import them into the CRM.</Typography>
      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Typography color="text.secondary">Supported formats: PDF, XLSX, XLS</Typography>
            <input type="file" accept=".pdf,.xlsx,.xls" onChange={(e) => setUploadFile(e.target.files[0])} disabled={uploading} />
            <Button variant="contained" onClick={handleUpload} disabled={!uploadFile || uploading}>Upload & Parse</Button>
            {uploadFile && !uploading && <Typography color="text.secondary">Selected file: {uploadFile.name}</Typography>}
            {uploading && (
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={22} color="primary" />
                <Typography color="text.secondary">Extracting contacts, please wait...</Typography>
              </Stack>
            )}
            {extractionInfo && !uploading && (
              <Alert severity="success">
                Successfully extracted <strong>{extractionInfo.count}</strong> contacts in{' '}
                <strong>{(extractionInfo.timeMs / 1000).toFixed(2)} seconds</strong>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );

  const renderUsers = () => (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>User Management</Typography>
      <Typography color="text.secondary" gutterBottom>Create new sales or admin accounts and keep access organized.</Typography>
      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Create Sales User</Typography>
          <Stack spacing={2}>
            {userError && <Alert severity="error" sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>{userError}</Alert>}
            <TextField label="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} autoComplete="off" required size="small" />
            <TextField label="Phone Number" value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} autoComplete="off" required size="small" />
            <TextField label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} autoComplete="new-password" required size="small" helperText="Min 5 characters, must include letters and numbers" />
            <FormControl>
              <InputLabel>Role</InputLabel>
              <Select value={newUser.role} label="Role" onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} size="small">
                <MenuItem value="SALES">Sales</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={createUser} disabled={!newUser.name || !newUser.phoneNumber || !newUser.password}>Create</Button>
          </Stack>
        </CardContent>
      </Card>
      <Card sx={{ mt: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Current Users</Typography>
          <Stack spacing={1.5}>
            {users.map((userItem) => (
              <Box key={userItem.userId} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f8fbff', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} sx={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userItem.name || userItem.phoneNumber}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: '0.8rem' }}>{userItem.phoneNumber} • {userItem.role}</Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
                  <Button size="small" variant="outlined" onClick={() => openReset(userItem)} sx={{ px: 1, fontSize: '0.7rem', minWidth: 0, whiteSpace: 'nowrap' }}>Reset Password</Button>
                  {userItem.phoneNumber !== loggedUser?.phoneNumber && (
                    <Button size="small" variant="outlined" color="error" onClick={() => deleteUser(userItem)} sx={{ px: 1, fontSize: '0.7rem', minWidth: 0, whiteSpace: 'nowrap' }}>Delete</Button>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Box>
      {currentSection === 'contacts' ? renderContacts() : currentSection === 'upload' ? renderUpload() : currentSection === 'users' ? renderUsers() : renderOverview()}

      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)}>
        <DialogTitle>Feedback</DialogTitle>
        <DialogContent>
          <TextField multiline rows={4} fullWidth value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Enter feedback..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveFeedback}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Phone Number" value={editContact.phoneNumber} fullWidth size="small" disabled helperText="Phone number cannot be changed" />
            <TextField label="Customer Name" value={editContact.customerName} onChange={(e) => setEditContact({ ...editContact, customerName: e.target.value })} fullWidth size="small" />
            <TextField label="Address" value={editContact.address} onChange={(e) => setEditContact({ ...editContact, address: e.target.value })} fullWidth size="small" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Resetting password for <strong>{resetTarget?.name || resetTarget?.phoneNumber}</strong></Typography>
            {userError && <Alert severity="error" sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>{userError}</Alert>}
            <TextField label="New Password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} fullWidth size="small" helperText="Min 5 characters, must include letters and numbers" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveReset}>Reset</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={successOpen} autoHideDuration={2500} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;
