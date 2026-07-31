import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

const ProfilePage = ({ user, onLogout }) => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Profile</Typography>
      <Typography color="text.secondary" gutterBottom>Keep your account details up to date and manage access</Typography>
      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#f8fbff' }}>
              <Typography variant="body2" color="text.secondary">Phone Number</Typography>
              <Typography variant="h6" fontWeight={700}>{user?.phoneNumber}</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#f8fbff' }}>
              <Typography variant="body2" color="text.secondary">Role</Typography>
              <Typography variant="h6" fontWeight={700}>{user?.role}</Typography>
            </Box>
            <Button variant="contained" color="error" onClick={onLogout} sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>Logout</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;
