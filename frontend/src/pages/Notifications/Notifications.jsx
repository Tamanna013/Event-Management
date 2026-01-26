import React from "react";
import { Container, Typography, Paper, Box } from "@mui/material";

const Notifications = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" fontWeight="700" gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View all your notifications
      </Typography>

      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          No Notifications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You're all caught up! No new notifications.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Notifications;
