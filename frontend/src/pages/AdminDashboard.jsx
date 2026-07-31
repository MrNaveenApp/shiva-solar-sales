import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Checkbox, Chip, Grid, Snackbar, Stack, Typography, TextField, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, InputLabel, Select, FormControl } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedSales, setSelectedSales] = useState('All');
  const [newUser, setNewUser] = useState({ name: '', phoneNumber: '', password: '', role: 'SALES' });
  const [page, setPage] = useState(1);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeContactId, setActiveContactId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const location = useLocation();

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

  useEffect(() => {
    fetchData();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = `${contact.customerName} ${contact.phoneNumber}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'All' || contact.interestedStatus === filterStatus;
    const matchesSales = selectedSales === 'All' || contact.assignedSalesId === selectedSales;
    return matchesSearch && matchesStatus && matchesSales;
  });

  const pagedContacts = filteredContacts.slice((page - 1) * 20, page * 20);

  const createUser = async () => {
    try {
      const { data } = await api.post('/users', newUser);
      setUsers((prev) => [...prev, data.user]);
      setNewUser({ name: '', phoneNumber: '', password: '', role: 'SALES' });
      setSuccessMsg('User created successfully');
      setSuccessOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      await api.post('/contacts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadFile(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const updateContact = async (contactId, updates) => {
    try {
      await api.put(`/contacts/${contactId}`, updates);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const assignContacts = async () => {
    if (!selectedContactIds.length || !assignTargetUserId) return;
    await api.put('/contacts/assign', { contactIds: selectedContactIds, assignedSalesId: assignTargetUserId });
    setSelectedContactIds([]);
    setAssignTargetUserId('');
    fetchData();
    setSuccessMsg('Contacts assigned successfully');
    setSuccessOpen(true);
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    const pageIds = pagedContacts.map((c) => c.contactId);
    const allSelected = pageIds.every((id) => selectedContactIds.includes(id));
    setSelectedContactIds(allSelected ? selectedContactIds.filter((id) => !pageIds.includes(id)) : [...new Set([...selectedContactIds, ...pageIds])]);
  };

  const openFeedback = (contactId, feedback) => {
    setActiveContactId(contactId);
    setFeedbackText(feedback || '');
    setFeedbackOpen(true);
  };

  const saveFeedback = async () => {
    try {
      await api.post('/feedback', { contactId: activeContactId, feedback: feedbackText });
      setFeedbackOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const currentSection = location.pathname === '/admin/contacts'
    ? 'contacts'
    : location.pathname === '/admin/upload'
      ? 'upload'
      : location.pathname === '/admin/users'
        ? 'users'
        : 'dashboard';

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
    const pageIds = pagedContacts.map((c) => c.contactId);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedContactIds.includes(id));
    const salesUsers = users.filter((u) => u.role === 'SALES');

    const displayUser = (u) => u.name || u.phoneNumber;

    const getSalesName = (userId) => {
      const u = users.find((userItem) => userItem.userId === userId);
      if (!u) return null;
      return displayUser(u);
    };

    return (
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>Contacts</Typography>
            <Typography color="text.secondary" gutterBottom>Review and manage all assigned leads in one place.</Typography>
          </Box>
          <Button component={Link} to="/admin/upload" variant="outlined">Upload Contacts</Button>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 3 }}>
          <TextField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
          <FormControl sx={{ minWidth: { xs: '100%', md: 180 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Interested">Interested</MenuItem>
              <MenuItem value="Not Interested">Not Interested</MenuItem>
              <MenuItem value="Follow Up">Follow Up</MenuItem>
              <MenuItem value="No Response">No Response</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 220 } }}>
            <InputLabel>Assigned Sales</InputLabel>
            <Select value={selectedSales} label="Assigned Sales" onChange={(e) => setSelectedSales(e.target.value)}>
              <MenuItem value="All">All</MenuItem>
              {salesUsers.map((u) => <MenuItem key={u.userId} value={u.userId}>{displayUser(u)}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {selectedContactIds.length > 0 && (
          <Card sx={{ mt: 2, p: 2, borderRadius: 3, background: '#FFF7ED' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <Chip label={`${selectedContactIds.length} selected`} color="primary" sx={{ fontWeight: 700 }} />
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Assign to Sales Person</InputLabel>
                <Select value={assignTargetUserId} label="Assign to Sales Person" onChange={(e) => setAssignTargetUserId(e.target.value)}>
                  {salesUsers.map((u) => <MenuItem key={u.userId} value={u.userId}>{displayUser(u)}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" disabled={!assignTargetUserId} onClick={assignContacts}>Assign Selected</Button>
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
                <TableCell>Sales Person</TableCell>
                <TableCell>Call</TableCell>
                <TableCell>Interested Status</TableCell>
                <TableCell>Feedback</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedContacts.map((contact) => (
                <TableRow key={contact.contactId} selected={selectedContactIds.includes(contact.contactId)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedContactIds.includes(contact.contactId)} onChange={() => toggleContactSelection(contact.contactId)} />
                  </TableCell>
                  <TableCell>{contact.customerName}</TableCell>
                  <TableCell>{contact.phoneNumber}</TableCell>
                  <TableCell>{getSalesName(contact.assignedSalesId) || <Typography color="text.secondary">Unassigned</Typography>}</TableCell>
                  <TableCell><Button href={`tel:${contact.phoneNumber}`} variant="outlined" size="small">Call</Button></TableCell>
                  <TableCell>
                    <Select value={contact.interestedStatus} onChange={(e) => updateContact(contact.contactId, { interestedStatus: e.target.value })} size="small">
                      <MenuItem value="Interested">Interested</MenuItem>
                      <MenuItem value="Not Interested">Not Interested</MenuItem>
                      <MenuItem value="Follow Up">Follow Up</MenuItem>
                      <MenuItem value="No Response">No Response</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => openFeedback(contact.contactId, contact.feedback)} size="small">{contact.feedback ? 'Edit' : 'Add'} Feedback</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button onClick={() => setPage(page + 1)}>Next</Button>
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
            <input type="file" accept=".pdf,.xlsx,.xls" onChange={(e) => setUploadFile(e.target.files[0])} />
            <Button variant="contained" onClick={handleUpload}>Upload & Parse</Button>
            {uploadFile && <Typography color="text.secondary">Selected file: {uploadFile.name}</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Next steps</Typography>
          <Typography color="text.secondary">Once the file is uploaded, the CRM will refresh the contact list and make the new records available in the contact section.</Typography>
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
            <TextField label="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} autoComplete="off" required />
            <TextField label="Phone Number" value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} autoComplete="off" required />
            <TextField label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} autoComplete="new-password" required />
            <FormControl>
              <InputLabel>Role</InputLabel>
              <Select value={newUser.role} label="Role" onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
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
              <Box key={userItem.userId} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f8fbff' }}>
                <Typography fontWeight={700}>{userItem.name || userItem.phoneNumber}</Typography>
                <Typography color="text.secondary">{userItem.phoneNumber} • {userItem.role}</Typography>
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
          <TextField multiline rows={4} fullWidth value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveFeedback}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={successOpen} autoHideDuration={2500} onClose={() => setSuccessOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setSuccessOpen(false)}>{successMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;
