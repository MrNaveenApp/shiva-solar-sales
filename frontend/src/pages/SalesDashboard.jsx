import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Grid, Stack, Typography, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Call as CallIcon } from '@mui/icons-material';
import api from '../api';

const SalesDashboard = () => {
  const [contacts, setContacts] = useState([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeContactId, setActiveContactId] = useState('');

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts');
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const updateContact = async (contactId, updates) => {
    try {
      await api.put(`/contacts/${contactId}`, updates);
      fetchContacts();
    } catch (error) {
      console.error(error);
    }
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
      fetchContacts();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Sales Dashboard</Typography>
      <Typography color="text.secondary" gutterBottom>View your assigned contacts and update outcomes</Typography>

      <Card sx={{ mt: 2, borderRadius: 3, background: '#FFF7ED' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box>
              <Typography color="text.secondary" variant="body2">Assigned Contacts</Typography>
              <Typography variant="h4" fontWeight={700} color="primary">{contacts.length}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">Interested</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{contacts.filter((c) => c.interestedStatus === 'Interested').length}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">Follow Up</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">{contacts.filter((c) => c.interestedStatus === 'Follow Up').length}</Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2">No Response</Typography>
              <Typography variant="h5" fontWeight={700} color="text.secondary">{contacts.filter((c) => c.interestedStatus === 'No Response').length}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Paper sx={{ mt: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Call</TableCell>
              <TableCell>Interested Status</TableCell>
              <TableCell>Feedback</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.contactId}>
                <TableCell>{contact.customerName}</TableCell>
                <TableCell><Button component="a" href={`tel:${contact.phoneNumber}`} size="small" color="primary" sx={{ textTransform: 'none' }}>{contact.phoneNumber}</Button></TableCell>
                <TableCell><Button component="a" href={`tel:${contact.phoneNumber}`} variant="contained" size="small" startIcon={<CallIcon />}>Call</Button></TableCell>
                <TableCell>
                  <Select value={contact.interestedStatus} onChange={(e) => updateContact(contact.contactId, { interestedStatus: e.target.value })}>
                    <MenuItem value="Interested">Interested</MenuItem>
                    <MenuItem value="Not Interested">Not Interested</MenuItem>
                    <MenuItem value="Follow Up">Follow Up</MenuItem>
                    <MenuItem value="No Response">No Response</MenuItem>
                  </Select>
                </TableCell>
                <TableCell><Button onClick={() => openFeedback(contact.contactId, contact.feedback)}>{contact.feedback ? 'Edit Feedback' : 'Add Feedback'}</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

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
    </Box>
  );
};

export default SalesDashboard;
