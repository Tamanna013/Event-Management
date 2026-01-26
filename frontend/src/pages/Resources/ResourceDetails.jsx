import React from "react";
import { Container, Typography, Paper, Box, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";

const ResourceDetails = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          component={RouterLink}
          to="/resources"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none" }}
        >
          Back to Resources
        </Button>
      </Box>

      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Resource Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Resource details page coming soon...
        </Typography>
      </Paper>
    </Container>
  );
};

export default ResourceDetails;
