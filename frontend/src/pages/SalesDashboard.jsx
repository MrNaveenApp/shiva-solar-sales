import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const SalesDashboard = () => {
  const [contacts, setContacts] = useState([]);
  const navigate = useNavigate();

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

  const updateContact = async (phone, updates) => {
    try {
      await api.put(`/contacts/${phone}`, updates);
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
              <TableCell>Address</TableCell>
              <TableCell>Interested Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow
                key={contact.phoneNumber}
                hover
                onClick={() => navigate(`/contact/${contact.phoneNumber}`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{contact.customerName}</TableCell>
                <TableCell>{contact.phoneNumber}</TableCell>
                <TableCell>{contact.address || <Typography variant="body2" color="text.secondary">—</Typography>}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select value={contact.interestedStatus} onChange={(e) => updateContact(contact.phoneNumber, { interestedStatus: e.target.value })} onClick={(e) => e.stopPropagation()} size="small">
                    <MenuItem value="Interested">Interested</MenuItem>
                    <MenuItem value="Not Interested">Not Interested</MenuItem>
                    <MenuItem value="Follow Up">Follow Up</MenuItem>
                    <MenuItem value="No Response">No Response</MenuItem>
                    <MenuItem value="Installed">Installed</MenuItem>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default SalesDashboard;
