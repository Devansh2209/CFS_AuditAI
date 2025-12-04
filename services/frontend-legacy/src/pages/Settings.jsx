import React, { useState } from 'react';
import {
    Box,
    Grid,
    Typography,
    Tabs,
    Tab,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Button,
    Divider,
    Avatar,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Person,
    Notifications,
    IntegrationInstructions,
    Storage,
    Save,
    Refresh,
    CheckCircle,
    Error as ErrorIcon,
} from '@mui/icons-material';

const Settings = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [settings, setSettings] = useState({
        general: {
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
            language: 'en',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            theme: 'light',
            density: 'comfortable',
        },
        integrations: {
            quickbooks: { connected: true, lastSync: '2024-01-15T14:00:00Z' },
            plaid: { connected: true, accounts: 3 },
            googleDrive: { connected: false },
            xero: { connected: false },
        },
        notifications: {
            emailAlerts: true,
            pushNotifications: true,
            weeklyDigest: true,
            transactionAlerts: true,
            approvalReminders: true,
        },
        system: {
            dataRetention: 365,
            autoBackup: true,
            debugMode: false,
            exportFormat: 'pdf',
        },
    });

    const handleSettingChange = (category, key, value) => {
        setSettings({
            ...settings,
            [category]: {
                ...settings[category],
                [key]: value,
            },
        });
    };

    const handleSave = () => {
        console.log('Saving settings:', settings);
        // In real app, call API to save settings
    };

    const handleReset = () => {
        console.log('Resetting settings');
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Settings & Configuration
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage your preferences, integrations, and system configuration
                </Typography>
            </Box>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab icon={<Person />} label="General" iconPosition="start" />
                <Tab icon={<IntegrationInstructions />} label="Integrations" iconPosition="start" />
                <Tab icon={<Notifications />} label="Notifications" iconPosition="start" />
                <Tab icon={<Storage />} label="System" iconPosition="start" />
            </Tabs>

            {/* General Settings Tab */}
            {activeTab === 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        General Settings
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                        {/* Profile Section */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Profile
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Name"
                                value={settings.general.name}
                                onChange={(e) => handleSettingChange('general', 'name', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={settings.general.email}
                                onChange={(e) => handleSettingChange('general', 'email', e.target.value)}
                            />
                        </Grid>

                        {/* Preferences Section */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                                Preferences
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Language</InputLabel>
                                <Select
                                    value={settings.general.language}
                                    label="Language"
                                    onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                                >
                                    <MenuItem value="en">English</MenuItem>
                                    <MenuItem value="es">Spanish</MenuItem>
                                    <MenuItem value="fr">French</MenuItem>
                                    <MenuItem value="de">German</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Timezone</InputLabel>
                                <Select
                                    value={settings.general.timezone}
                                    label="Timezone"
                                    onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                                >
                                    <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                                    <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                                    <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                                    <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                                    <MenuItem value="Europe/London">London (GMT)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Date Format</InputLabel>
                                <Select
                                    value={settings.general.dateFormat}
                                    label="Date Format"
                                    onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                                >
                                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Display Section */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                                Display
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Theme</InputLabel>
                                <Select
                                    value={settings.general.theme}
                                    label="Theme"
                                    onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
                                >
                                    <MenuItem value="light">Light</MenuItem>
                                    <MenuItem value="dark">Dark</MenuItem>
                                    <MenuItem value="auto">Auto</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Density</InputLabel>
                                <Select
                                    value={settings.general.density}
                                    label="Density"
                                    onChange={(e) => handleSettingChange('general', 'density', e.target.value)}
                                >
                                    <MenuItem value="comfortable">Comfortable</MenuItem>
                                    <MenuItem value="compact">Compact</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                            Save Changes
                        </Button>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={handleReset}>
                            Reset
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Integrations Tab */}
            {activeTab === 1 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Integrations
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <List>
                        <ListItem>
                            <ListItemText
                                primary="QuickBooks"
                                secondary={
                                    settings.integrations.quickbooks.connected
                                        ? `Last synced: ${new Date(settings.integrations.quickbooks.lastSync).toLocaleString()}`
                                        : 'Not connected'
                                }
                            />
                            <ListItemSecondaryAction>
                                <Chip
                                    icon={settings.integrations.quickbooks.connected ? <CheckCircle /> : <ErrorIcon />}
                                    label={settings.integrations.quickbooks.connected ? 'Connected' : 'Disconnected'}
                                    color={settings.integrations.quickbooks.connected ? 'success' : 'default'}
                                    sx={{ mr: 1 }}
                                />
                                <Button
                                    variant={settings.integrations.quickbooks.connected ? 'outlined' : 'contained'}
                                    size="small"
                                >
                                    {settings.integrations.quickbooks.connected ? 'Disconnect' : 'Connect'}
                                </Button>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Plaid (Banking)"
                                secondary={
                                    settings.integrations.plaid.connected
                                        ? `${settings.integrations.plaid.accounts} accounts connected`
                                        : 'Not connected'
                                }
                            />
                            <ListItemSecondaryAction>
                                <Chip
                                    icon={settings.integrations.plaid.connected ? <CheckCircle /> : <ErrorIcon />}
                                    label={settings.integrations.plaid.connected ? 'Connected' : 'Disconnected'}
                                    color={settings.integrations.plaid.connected ? 'success' : 'default'}
                                    sx={{ mr: 1 }}
                                />
                                <Button
                                    variant={settings.integrations.plaid.connected ? 'outlined' : 'contained'}
                                    size="small"
                                >
                                    {settings.integrations.plaid.connected ? 'Manage' : 'Connect'}
                                </Button>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Google Drive"
                                secondary="Store evidence packages and reports"
                            />
                            <ListItemSecondaryAction>
                                <Chip
                                    icon={settings.integrations.googleDrive.connected ? <CheckCircle /> : <ErrorIcon />}
                                    label={settings.integrations.googleDrive.connected ? 'Connected' : 'Disconnected'}
                                    color={settings.integrations.googleDrive.connected ? 'success' : 'default'}
                                    sx={{ mr: 1 }}
                                />
                                <Button
                                    variant={settings.integrations.googleDrive.connected ? 'outlined' : 'contained'}
                                    size="small"
                                >
                                    {settings.integrations.googleDrive.connected ? 'Disconnect' : 'Connect'}
                                </Button>
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Xero"
                                secondary="Accounting software integration"
                            />
                            <ListItemSecondaryAction>
                                <Chip
                                    icon={settings.integrations.xero.connected ? <CheckCircle /> : <ErrorIcon />}
                                    label={settings.integrations.xero.connected ? 'Connected' : 'Disconnected'}
                                    color={settings.integrations.xero.connected ? 'success' : 'default'}
                                    sx={{ mr: 1 }}
                                />
                                <Button
                                    variant={settings.integrations.xero.connected ? 'outlined' : 'contained'}
                                    size="small"
                                >
                                    {settings.integrations.xero.connected ? 'Disconnect' : 'Connect'}
                                </Button>
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>
                </Paper>
            )}

            {/* Notifications Tab */}
            {activeTab === 2 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Notification Preferences
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <List>
                        <ListItem>
                            <ListItemText
                                primary="Email Alerts"
                                secondary="Receive email notifications for important events"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={settings.notifications.emailAlerts}
                                    onChange={(e) =>
                                        handleSettingChange('notifications', 'emailAlerts', e.target.checked)
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Push Notifications"
                                secondary="Mobile and desktop push notifications"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={settings.notifications.pushNotifications}
                                    onChange={(e) =>
                                        handleSettingChange('notifications', 'pushNotifications', e.target.checked)
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Weekly Digest"
                                secondary="Summary email every Monday morning"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={settings.notifications.weeklyDigest}
                                    onChange={(e) =>
                                        handleSettingChange('notifications', 'weeklyDigest', e.target.checked)
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Transaction Alerts"
                                secondary="Notify when new transactions are imported"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={settings.notifications.transactionAlerts}
                                    onChange={(e) =>
                                        handleSettingChange('notifications', 'transactionAlerts', e.target.checked)
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                        <Divider />

                        <ListItem>
                            <ListItemText
                                primary="Approval Reminders"
                                secondary="Remind about pending approvals"
                            />
                            <ListItemSecondaryAction>
                                <Switch
                                    checked={settings.notifications.approvalReminders}
                                    onChange={(e) =>
                                        handleSettingChange('notifications', 'approvalReminders', e.target.checked)
                                    }
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                    </List>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                            Save Changes
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* System Configuration Tab */}
            {activeTab === 3 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        System Configuration
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Data Retention (days)"
                                value={settings.system.dataRetention}
                                onChange={(e) =>
                                    handleSettingChange('system', 'dataRetention', parseInt(e.target.value))
                                }
                                helperText="Number of days to retain transaction data"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Default Export Format</InputLabel>
                                <Select
                                    value={settings.system.exportFormat}
                                    label="Default Export Format"
                                    onChange={(e) => handleSettingChange('system', 'exportFormat', e.target.value)}
                                >
                                    <MenuItem value="pdf">PDF</MenuItem>
                                    <MenuItem value="excel">Excel</MenuItem>
                                    <MenuItem value="csv">CSV</MenuItem>
                                    <MenuItem value="json">JSON</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.system.autoBackup}
                                        onChange={(e) =>
                                            handleSettingChange('system', 'autoBackup', e.target.checked)
                                        }
                                    />
                                }
                                label="Automatic Backup"
                            />
                            <Typography variant="caption" color="text.secondary" display="block">
                                Automatically backup data daily at 2:00 AM
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.system.debugMode}
                                        onChange={(e) =>
                                            handleSettingChange('system', 'debugMode', e.target.checked)
                                        }
                                    />
                                }
                                label="Debug Mode"
                            />
                            <Typography variant="caption" color="text.secondary" display="block">
                                Enable detailed logging for troubleshooting (not recommended for production)
                            </Typography>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                            Save Changes
                        </Button>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={handleReset}>
                            Reset to Defaults
                        </Button>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default Settings;
