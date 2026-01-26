import React from "react";
import { Container, Typography, Paper, Box, Alert } from "@mui/material";
import { AdminPanelSettings as AdminIcon } from "@mui/icons-material";

const Admin = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3 }}>
        <AdminIcon sx={{ fontSize: 40, color: "primary.main" }} />
        <Box>
          <Typography variant="h4" fontWeight="700">
            Admin Panel
          </Typography>
          <Typography variant="body1" color="text.secondary">
            System administration and management
          </Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Welcome to the Admin Panel. This section is for authorized
        administrators only.
      </Alert>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Administration Features
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Full administration features coming soon...
        </Typography>
      </Paper>
    </Container>
  );
};

export default Admin;
