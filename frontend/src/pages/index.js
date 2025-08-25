import {useState, useEffect} from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    Typography,
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    CircularProgress
} from '@mui/material';
import {Add as AddIcon, AutoAwesome as AIIcon} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = 'http://localhost:3333';

export default function Home() {
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [composeOpen, setComposeOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [emailForm, setEmailForm] = useState({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: ''
    });

    useEffect(() => {
        ping();
        fetchEmails();
    }, []);

    const ping = async () => {
        try {
            const response = await axios.get(`${API_BASE}/ping`);
            console.log(response.data);
        } catch (error) {
            console.log(error);
        }
    }

    const fetchEmails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/emails`);
            setEmails(response.data);
            if (response.data.length > 0 && !selectedEmail) {
                setSelectedEmail(response.data[0]);
            }
        } catch (error) {
            setError('Failed to fetch emails');
            console.error('Error fetching emails:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSelect = (email) => {
        setSelectedEmail(email);
    };

    const handleComposeOpen = () => {
        setComposeOpen(true);
        setEmailForm({
            to: '',
            cc: '',
            bcc: '',
            subject: '',
            body: ''
        });
        setValidationErrors({});
        setError('');
    };

    const handleComposeClose = () => {
        setComposeOpen(false);
        setError('');
        setValidationErrors({});
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateField = (field, value) => {
        const errors = {...validationErrors};

        switch (field) {
            case 'to':
                if (!value.trim()) {
                    errors.to = 'To field is required';
                } else if (!validateEmail(value.trim())) {
                    errors.to = 'Please enter a valid email address';
                } else {
                    delete errors.to;
                }
                break;
            case 'cc':
                if (value.trim() && !validateEmail(value.trim())) {
                    errors.cc = 'Please enter a valid email address';
                } else {
                    delete errors.cc;
                }
                break;
            case 'bcc':
                if (value.trim() && !validateEmail(value.trim())) {
                    errors.bcc = 'Please enter a valid email address';
                } else {
                    delete errors.bcc;
                }
                break;
            case 'subject':
                if (!value.trim()) {
                    errors.subject = 'Subject is required';
                } else {
                    delete errors.subject;
                }
                break;
            default:
                break;
        }

        setValidationErrors(errors);
    };

    const handleFormChange = (field) => (event) => {
        const value = event.target.value;
        setEmailForm({
            ...emailForm,
            [field]: value
        });

        // Validate field on change
        validateField(field, value);
    };

    const handleAIGenerate = async () => {
        const prompt = window.prompt('Describe what the email should be about:');
        if (!prompt) return;

        try {
            setLoading(true);
            const response = await axios.post(`${API_BASE}/generate/router`, {
                prompt: prompt
            });

            setEmailForm({
                ...emailForm,
                subject: response.data.subject,
                body: response.data.body
            });
        } catch (error) {
            setError('Failed to generate email content');
            console.error('Error generating email:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEmail = async () => {
        // Validate all required fields
        const errors = {};

        if (!emailForm.to.trim()) {
            errors.to = 'To field is required';
        } else if (!validateEmail(emailForm.to.trim())) {
            errors.to = 'Please enter a valid email address';
        }

        if (!emailForm.subject.trim()) {
            errors.subject = 'Subject is required';
        }

        if (emailForm.cc.trim() && !validateEmail(emailForm.cc.trim())) {
            errors.cc = 'Please enter a valid email address';
        }

        if (emailForm.bcc.trim() && !validateEmail(emailForm.bcc.trim())) {
            errors.bcc = 'Please enter a valid email address';
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setError('Please fix the validation errors before saving.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await axios.post(`${API_BASE}/emails`, emailForm);
            setComposeOpen(false);
            fetchEmails(); // Refresh the email list
        } catch (error) {
            setError('Failed to save email');
            console.error('Error saving email:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{mt: 2, height: '90vh'}}>
            <Grid container spacing={2} sx={{height: '100%'}}>
                {/* Sidebar - Email List */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                        <Box sx={{p: 2, borderBottom: 1, borderColor: 'divider'}}>
                            <Typography variant="h6">Emails</Typography>
                        </Box>
                        <List sx={{flex: 1, overflow: 'auto'}}>
                            {emails.map((email) => (
                                <ListItem
                                    key={email.id}
                                    selected={selectedEmail && selectedEmail.id === email.id}
                                    onClick={() => handleEmailSelect(email)}
                                    sx={{cursor: 'pointer'}}
                                >
                                    <ListItemText
                                        primary={email.subject || 'No Subject'}
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    To: {email.to}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(email.created_at).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                            {emails.length === 0 && (
                                <ListItem>
                                    <ListItemText primary="No emails yet"/>
                                </ListItem>
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* Main Area - Email Display */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{height: '100%', p: 2, overflow: 'auto'}}>
                        {selectedEmail ? (
                            <Box>
                                <Typography variant="h5" gutterBottom>
                                    {selectedEmail.subject || 'No Subject'}
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                    <strong>To:</strong> {selectedEmail.to}
                                </Typography>
                                {selectedEmail.cc && (
                                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                        <strong>CC:</strong> {selectedEmail.cc}
                                    </Typography>
                                )}
                                {selectedEmail.bcc && (
                                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                        <strong>BCC:</strong> {selectedEmail.bcc}
                                    </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                    {new Date(selectedEmail.created_at).toLocaleString()}
                                </Typography>
                                <Box sx={{mt: 3, whiteSpace: 'pre-wrap'}}>
                                    <Typography variant="body1">
                                        {selectedEmail.body || 'No content'}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                                <Typography variant="h6" color="text.secondary">
                                    Select an email to view
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Compose FAB */}
            <Fab
                color="primary"
                aria-label="compose"
                onClick={handleComposeOpen}
                sx={{position: 'fixed', bottom: 16, right: 16}}
            >
                <AddIcon/>
            </Fab>

            {/* Compose Email Dialog */}
            <Dialog open={composeOpen} onClose={handleComposeClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    Compose Email
                    <Button
                        startIcon={<AIIcon/>}
                        onClick={handleAIGenerate}
                        sx={{ml: 2}}
                        variant="outlined"
                        size="small"
                        disabled={loading}
                    >
                        AI ✨
                    </Button>
                </DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

                    <TextField
                        fullWidth
                        label="To"
                        value={emailForm.to}
                        onChange={handleFormChange('to')}
                        margin="normal"
                        required
                        error={!!validationErrors.to}
                        helperText={validationErrors.to || "Required field"}
                    />

                    <TextField
                        fullWidth
                        label="CC"
                        value={emailForm.cc}
                        onChange={handleFormChange('cc')}
                        margin="normal"
                        error={!!validationErrors.cc}
                        helperText={validationErrors.cc}
                    />

                    <TextField
                        fullWidth
                        label="BCC"
                        value={emailForm.bcc}
                        onChange={handleFormChange('bcc')}
                        margin="normal"
                        error={!!validationErrors.bcc}
                        helperText={validationErrors.bcc}
                    />

                    <TextField
                        fullWidth
                        label="Subject"
                        value={emailForm.subject}
                        onChange={handleFormChange('subject')}
                        margin="normal"
                        required
                        error={!!validationErrors.subject}
                        helperText={validationErrors.subject || "Required field"}
                    />

                    <TextField
                        fullWidth
                        label="Body"
                        value={emailForm.body}
                        onChange={handleFormChange('body')}
                        margin="normal"
                        multiline
                        rows={10}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleComposeClose}>Cancel</Button>
                    <Button
                        onClick={handleSaveEmail}
                        variant="contained"
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={16}/>}
                    >
                        Save Email
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
