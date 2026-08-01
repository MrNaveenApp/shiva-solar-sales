import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import StatusChip from '../components/StatusChip';
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

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Sales Dashboard</Typography>
      <Typography color="text.secondary" gutterBottom>Tap a contact to view details and update</Typography>

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
              <Typography color="text.secondary" variant="body2">Need to Call</Typography>
              <Typography variant="h5" fontWeight={700} color="info.main">{contacts.filter((c) => c.interestedStatus === 'Need to Call').length}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Paper sx={{ mt: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer Name</TableCell>
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
                <TableCell><StatusChip status={contact.interestedStatus} /></TableCell>
              </TableRow>
            ))}
            {contacts.length === 0 && (
              <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No assigned contacts</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default SalesDashboard;
