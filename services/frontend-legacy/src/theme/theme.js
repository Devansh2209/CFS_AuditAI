import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#0d47a1', // Trust Blue
            light: '#5472d3',
            lighter: '#e3f2fd', // Blue 50
            dark: '#002171',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#1976d2', // Lighter Blue
            lighter: '#e3f2fd',
        },
        success: {
            main: '#2e7d32', // Growth Green
            light: '#4caf50',
            lighter: '#e8f5e9', // Green 50
        },
        warning: {
            main: '#ed6c02', // Caution Orange
            light: '#ff9800',
            lighter: '#fff3e0', // Orange 50
        },
        error: {
            main: '#d32f2f', // Debt Red
            light: '#ef5350',
            lighter: '#ffebee', // Red 50
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
        text: {
            primary: '#2c3e50',
            secondary: '#546e7a',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 600,
            fontSize: '2.5rem',
        },
        h2: {
            fontWeight: 600,
            fontSize: '2rem',
        },
        h3: {
            fontWeight: 600,
            fontSize: '1.75rem',
        },
        h4: {
            fontWeight: 500,
            fontSize: '1.5rem',
        },
        h5: {
            fontWeight: 500,
            fontSize: '1.25rem',
        },
        h6: {
            fontWeight: 500,
            fontSize: '1rem',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.43,
        },
        button: {
            textTransform: 'none', // Financial apps prefer standard casing
            fontWeight: 600,
        },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e0e0e0',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                        borderBottom: '1px solid #f0f0f0',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f8f9fa',
                        borderBottom: '1px solid #e0e0e0',
                    },
                },
            },
        },
    },
});

export default theme;
