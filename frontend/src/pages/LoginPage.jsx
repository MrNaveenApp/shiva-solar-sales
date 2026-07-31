import { useState } from 'react';
import { Box, Button, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';

const LoginPage = ({ onLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(phoneNumber, password);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)', px: { xs: 1.5, sm: 3 }, py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm" disableGutters>
        <Card elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)' }}>
          <Box sx={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', p: { xs: 3, sm: 4 } }}>
            <Typography variant="h4" fontWeight={800}>Shiva Solar Sales</Typography>
            <Typography sx={{ mt: 1, opacity: 0.9 }}>Secure access for admins and sales teams</Typography>
          </Box>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h6" fontWeight={700}>Welcome back</Typography>
                <Typography color="text.secondary">Use your credentials to continue</Typography>
              </Box>
              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required fullWidth autoComplete="off" />
                  <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth autoComplete="new-password" />
                  <Button variant="contained" size="large" type="submit" sx={{ py: 1.2 }}>Login</Button>
                </Stack>
              </form>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>Demo credentials: phone 9999999999 / password admin123</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;
