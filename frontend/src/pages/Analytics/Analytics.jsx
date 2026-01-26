import React from "react";
import { Container, Typography, Paper, Box } from "@mui/material";

const Analytics = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" fontWeight="700" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        View insights and statistics about campus activities
      </Typography>

      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Analytics Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This section is under development. Check back soon for detailed
          analytics!
        </Typography>
      </Paper>
    </Container>
  );
};

export default Analytics;
