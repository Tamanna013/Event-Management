import React from "react";
import { Container, Typography, Paper, Box } from "@mui/material";

const Messages = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" fontWeight="700" gutterBottom>
        Messages
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Connect with other campus members
      </Typography>

      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Messaging Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time messaging features are under development.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Messages;
