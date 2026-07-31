import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, CssBaseline, Snackbar, ThemeProvider, createTheme } from '@mui/material';
import api from './api';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import SalesDashboard from './pages/SalesDashboard';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';

const App = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('crmUser') || 'null'));
  const [token, setToken] = useState(localStorage.getItem('crmToken') || '');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  const login = async (phoneNumber, password) => {
    setLoading(true);
    try {
      const response = await api.post('/login', { phoneNumber, password });
      const { token: newToken, user: loggedUser } = response.data;
      localStorage.setItem('crmToken', newToken);
      localStorage.setItem('crmUser', JSON.stringify(loggedUser));
      setToken(newToken);
      setUser(loggedUser);
      setSnackbar({ open: true, message: 'Logged in successfully', severity: 'success' });
      navigate(loggedUser.role === 'ADMIN' ? '/admin' : '/sales');
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Login failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('crmToken');
    localStorage.removeItem('crmUser');
    setToken('');
    setUser(null);
    navigate('/login');
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: { main: '#FB923C' },
          secondary: { main: '#0f172a' },
          background: { default: '#f8fafc', paper: '#ffffff' },
        },
        shape: { borderRadius: 16 },
        typography: {
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h4: { fontWeight: 700 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 600 },
        },
        components: {
          MuiCard: { styleOverrides: { root: { boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)' } } } ,
          MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, borderRadius: 999 } } },
        },
      }),
    []
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f8fafc">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/sales'} replace /> : <LoginPage onLogin={login} />} />
        <Route path="/" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/sales'} replace /> : <Navigate to="/login" replace />} />
        <Route path="/admin/*" element={user && user.role === 'ADMIN' ? <Layout user={user} onLogout={logout}><AdminDashboard /></Layout> : <Navigate to="/login" replace />} />
        <Route path="/sales/*" element={user && user.role === 'SALES' ? <Layout user={user} onLogout={logout}><SalesDashboard /></Layout> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={user ? <Layout user={user} onLogout={logout}><ProfilePage user={user} onLogout={logout} /></Layout> : <Navigate to="/login" replace />} />
      </Routes>
      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
