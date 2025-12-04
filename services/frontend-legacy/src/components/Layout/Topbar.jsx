import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Avatar, Box, Badge } from '@mui/material';
import { Notifications, Search, HelpOutline } from '@mui/icons-material';

const drawerWidth = 260;

const Topbar = () => {
    return (
        <AppBar
            position="fixed"
            sx={{
                width: `calc(100% - ${drawerWidth}px)`,
                ml: `${drawerWidth}px`,
                backgroundColor: 'white',
                color: 'text.primary',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
        >
            <Toolbar>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" color="text.primary" fontWeight="600">
                        Dashboard
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton>
                        <Search />
                    </IconButton>
                    <IconButton>
                        <Badge badgeContent={4} color="error">
                            <Notifications />
                        </Badge>
                    </IconButton>
                    <IconButton>
                        <HelpOutline />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2, borderLeft: '1px solid #eee', pl: 2 }}>
                        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="subtitle2" fontWeight="600">
                                Admin User
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                CFO Role
                            </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>A</Avatar>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Topbar;
