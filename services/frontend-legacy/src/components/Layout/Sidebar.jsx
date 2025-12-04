import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Typography, Divider } from '@mui/material';
import { Dashboard, ReceiptLong, AccountTree, Gavel, Settings, Security } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Transactions', icon: <ReceiptLong />, path: '/transactions' },
    { text: 'Workflows', icon: <AccountTree />, path: '/workflows' },
    { text: 'Audit & Compliance', icon: <Gavel />, path: '/audit' },
    { text: 'Security', icon: <Security />, path: '/security' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    backgroundColor: '#1a237e', // Deep Blue
                    color: 'white',
                },
            }}
        >
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff' }}>
                    CFS AuditAI
                </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <List>
                {menuItems.map((item) => (
                    <ListItem
                        button
                        key={item.text}
                        onClick={() => navigate(item.path)}
                        sx={{
                            backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                            my: 0.5,
                            mx: 1,
                            borderRadius: 1,
                            width: 'auto',
                        }}
                    >
                        <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
