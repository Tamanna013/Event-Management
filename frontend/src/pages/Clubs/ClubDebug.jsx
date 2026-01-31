import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
} from "@mui/material";
import api from "../../services/api";

const ClubDebug = () => {
  const { id } = useParams();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllClubs();
  }, []);

  const fetchAllClubs = async () => {
    try {
      const response = await api.get("/clubs/");
      setClubs(response.data);
    } catch (error) {
      setError("Failed to fetch clubs");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const testClubId = async () => {
    try {
      console.log(`Testing club ID: ${id}`);
      const response = await api.get(`/clubs/${id}/`);
      console.log("Club exists:", response.data);
      alert(`Club found: ${response.data.name}`);
    } catch (error) {
      console.error("Test failed:", error);
      alert(`Error: ${error.response?.status || "Unknown error"}`);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container sx={{ mt: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Club Debug Panel
        </Typography>
        <Typography variant="body1" gutterBottom>
          Current Club ID from URL: <strong>{id}</strong>
        </Typography>
        <Button variant="contained" onClick={testClubId} sx={{ mb: 3 }}>
          Test This Club ID
        </Button>

        {error && <Alert severity="error">{error}</Alert>}

        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          Available Clubs ({clubs.length})
        </Typography>
        <List>
          {clubs.map((club) => (
            <ListItem
              key={club.id}
              divider
              sx={{
                backgroundColor: club.id === id ? "#e3f2fd" : "transparent",
              }}
            >
              <ListItemText
                primary={club.name}
                secondary={
                  <>
                    <Typography variant="body2">ID: {club.id}</Typography>
                    <Typography variant="body2">
                      Type: {club.club_type} | Members: {club.member_count}
                    </Typography>
                  </>
                }
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => (window.location.href = `/clubs/${club.id}`)}
              >
                View
              </Button>
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default ClubDebug;
