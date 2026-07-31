import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Container, Link, Stack, TextField, Typography } from '@mui/material';

const isValidPassword = (pw) => typeof pw === 'string' && pw.length >= 5 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const PASSWORD_ERROR = 'Password must be at least 5 characters and contain both letters and numbers';

const LoginPage = ({ onLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValidPassword(password)) {
      setError(PASSWORD_ERROR);
      return;
    }
    setError('');
    onLogin(phoneNumber, password);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff7ed 0%, #f8fafc 100%)', px: { xs: 1.5, sm: 3 }, py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm" disableGutters>
        <Card elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)' }}>
          <Box sx={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white', p: { xs: 2.5, sm: 3.5 } }}>
            <Typography variant="h5" fontWeight={800}>Shiva Solar Sales</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>Secure access for admins and sales teams</Typography>
          </Box>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack spacing={2.5}>
              <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="h6" fontWeight={700}>Welcome back</Typography>
                <Typography variant="body2" color="text.secondary">Use your credentials to continue</Typography>
              </Box>
              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {error && <Alert severity="error" sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>{error}</Alert>}
                  <TextField label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required fullWidth autoComplete="off" size="small" />
                  <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth autoComplete="new-password" size="small" />
                  <Button variant="contained" type="submit" sx={{ py: 1 }}>Login</Button>
                  <Typography variant="body2" align="center">
                    <Link component="button" type="button" onClick={() => setError('Contact your administrator to reset your password.')} underline="hover" sx={{ fontSize: '0.8rem' }}>
                      Forgot Password?
                    </Link>
                  </Typography>
                </Stack>
              </form>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage;
