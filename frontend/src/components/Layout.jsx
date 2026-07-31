import { useState } from 'react';
import { AppBar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Dashboard as DashboardIcon, Contacts as ContactsIcon, PersonAdd as PersonAddIcon, Person as PersonIcon, Logout as LogoutIcon, UploadFile as UploadFileIcon, Menu as MenuIcon, Group as GroupIcon } from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';

const drawerWidth = 280;

const Layout = ({ children, user, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const closeDrawer = () => setMobileOpen(false);

  const menuItems = user?.role === 'ADMIN'
    ? [
        { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
        { label: 'Contacts', path: '/admin/contacts', icon: <ContactsIcon /> },
        { label: 'Sales Team', path: '/admin/team', icon: <GroupIcon /> },
        { label: 'Upload', path: '/admin/upload', icon: <UploadFileIcon /> },
        { label: 'Users', path: '/admin/users', icon: <PersonAddIcon /> },
        { label: 'Profile', path: '/profile', icon: <PersonIcon /> },
      ]
    : [
        { label: 'Contacts', path: '/sales', icon: <ContactsIcon /> },
        { label: 'Profile', path: '/profile', icon: <PersonIcon /> },
      ];

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%)' }}>
      <Toolbar sx={{ px: 2.5, py: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>Shiva Solar Sales</Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1.5 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={Link}
            to={item.path}
            onClick={closeDrawer}
            selected={location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListItemButton onClick={onLogout} sx={{ borderRadius: 2, mt: 1 }}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, background: 'linear-gradient(90deg, #FB923C, #F97316)', boxShadow: '0 8px 30px rgba(251, 146, 60, 0.18)' }}>
        <Toolbar sx={{ px: { xs: 1.5, sm: 2.5 } }}>
          {isMobile && (
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.2rem' }, color: '#ffffff' }}>Shiva Solar Sales Workspace</Typography>
          </Box>
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600, color: '#ffffff' }}>{user?.phoneNumber}</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' } }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, px: { xs: 1.5, sm: 2.5 }, py: { xs: 2, sm: 3 }, mt: { xs: 7, sm: 8 }, mb: { xs: 2, sm: 0 }, width: '100%', maxWidth: '1400px', mx: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
