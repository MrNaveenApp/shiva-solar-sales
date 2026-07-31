import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, Snackbar, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Call as CallIcon, Delete as DeleteIcon, Edit as EditIcon, Feedback as FeedbackIcon, Person as PersonIcon, LocationOn as LocationOnIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const STATUSES = ['Interested', 'Not Interested', 'Follow Up', 'No Response', 'Installed'];
const CALL_STATUSES = ['Need to Call', 'Not Answered', 'Answered'];

const ContactDetails = () => {
  const { phoneNumber } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('crmUser') || 'null');
  const isAdmin = user?.role === 'ADMIN';

  const [contact, setContact] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ phoneNumber: '', customerName: '', address: '' });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchContact = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/contacts/${phoneNumber}`);
      setContact(res.data.contact);
      if (isAdmin) {
        const usersRes = await api.get('/users');
        setUsers(usersRes.data.users || []);
      }
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to load contact', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContact(); }, [phoneNumber]);

  const showToast = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const updateStatus = async (status) => {
    try {
      await api.put(`/contacts/${phoneNumber}`, { interestedStatus: status });
      setContact((prev) => ({ ...prev, interestedStatus: status }));
      showToast('Status updated');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const updateCallStatus = async (callStatus) => {
    try {
      await api.put(`/contacts/${phoneNumber}`, { callStatus });
      setContact((prev) => ({ ...prev, callStatus }));
      showToast('Call status updated');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update call status', 'error');
    }
  };

  const openEdit = () => {
    setEditData({ phoneNumber: contact.phoneNumber, customerName: contact.customerName, address: contact.address || '' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      await api.put(`/contacts/${phoneNumber}`, {
        phoneNumber: editData.phoneNumber,
        customerName: editData.customerName,
        address: editData.address,
      });
      setEditOpen(false);
      showToast('Contact updated');
      if (editData.phoneNumber && editData.phoneNumber !== phoneNumber) {
        navigate(`/contact/${editData.phoneNumber}`);
      } else {
        fetchContact();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update', 'error');
    }
  };

  const deleteContact = async () => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/contacts/${phoneNumber}`);
      showToast('Contact deleted');
      setTimeout(() => navigate(isAdmin ? '/admin/contacts' : '/sales'), 900);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete', 'error');
    }
  };

  const openFeedback = () => {
    setFeedbackText(contact.feedback || '');
    setFeedbackOpen(true);
  };

  const saveFeedback = async () => {
    try {
      await api.post('/feedback', { phoneNumber, feedback: feedbackText });
      setFeedbackOpen(false);
      showToast('Feedback saved');
      fetchContact();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save feedback', 'error');
    }
  };

  const salesName = isAdmin
    ? users.find((u) => u.userId === contact?.assignedSalesId)
    : null;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!contact) {
    return (
      <Box textAlign="center" py={6}>
        <Typography color="text.secondary">Contact not found</Typography>
        <Button onClick={() => navigate(isAdmin ? '/admin/contacts' : '/sales')} sx={{ mt: 2 }}>Back to Contacts</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(isAdmin ? '/admin/contacts' : '/sales')} sx={{ mb: 2 }}>Back</Button>

      <Typography variant="h4" fontWeight={700} gutterBottom>{contact.customerName}</Typography>
      <Typography color="text.secondary" gutterBottom>Contact details and quick actions</Typography>

      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PersonIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">Customer Name</Typography>
                <Typography fontWeight={600}>{contact.customerName}</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PhoneIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">Phone Number</Typography>
                <Typography fontWeight={600}>{contact.phoneNumber}</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocationOnIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography fontWeight={600}>{contact.address || '—'}</Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Interested Status</Typography>
                <FormControl size="small" sx={{ mt: 0.5, minWidth: 180 }}>
                  <Select
                    value={contact.interestedStatus || 'No Response'}
                    onChange={(e) => updateStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Call Status</Typography>
                <FormControl size="small" sx={{ mt: 0.5, minWidth: 180 }}>
                  <Select
                    value={contact.callStatus || 'Need to Call'}
                    onChange={(e) => updateCallStatus(e.target.value)}
                  >
                    {CALL_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            {isAdmin && (
              <>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary">Assigned Sales Person</Typography>
                  <Typography fontWeight={600} sx={{ mt: 0.5 }}>
                    {salesName ? `${salesName.name || salesName.phoneNumber}` : contact.assignedSalesId ? 'Unknown' : '—'}
                  </Typography>
                </Box>
              </>
            )}
            <Divider />
            <Box>
              <Typography variant="body2" color="text.secondary">Feedback</Typography>
              <Typography sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{contact.feedback || 'No feedback yet'}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
        <Button component="a" href={`tel:${contact.phoneNumber}`} variant="contained" size="large" startIcon={<CallIcon />}>Call {contact.phoneNumber}</Button>
        <Button variant="outlined" size="large" startIcon={<FeedbackIcon />} onClick={openFeedback}>{contact.feedback ? 'Edit Feedback' : 'Add Feedback'}</Button>
        {isAdmin && (
          <>
            <Button variant="outlined" size="large" startIcon={<EditIcon />} onClick={openEdit}>Edit</Button>
            <Button variant="outlined" color="error" size="large" startIcon={<DeleteIcon />} onClick={deleteContact}>Delete</Button>
          </>
        )}
      </Stack>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Phone Number" value={editData.phoneNumber} onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })} fullWidth size="small" />
            <TextField label="Customer Name" value={editData.customerName} onChange={(e) => setEditData({ ...editData, customerName: e.target.value })} fullWidth size="small" />
            <TextField label="Address" value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} fullWidth size="small" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Feedback</DialogTitle>
        <DialogContent>
          <TextField multiline rows={4} fullWidth value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Enter feedback..." size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveFeedback}>Save</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContactDetails;
