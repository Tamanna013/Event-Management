import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Grid,
  Divider,
  Avatar,
  LinearProgress,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Breadcrumbs,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Group as GroupIcon,
} from "@mui/icons-material";
import { format } from "date-fns";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${id}/`);
      setEvent(response.data);
      setIsRegistered(response.data.is_registered);
    } catch (error) {
      setError("Failed to load event details");
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      await api.post(`/events/${id}/register/`);
      setIsRegistered(true);
      fetchEventDetails(); // Refresh event data
    } catch (error) {
      console.error("Error registering for event:", error);
    }
  };

  const handleCancelRegistration = async () => {
    try {
      await api.post(`/events/${id}/cancel_registration/`);
      setIsRegistered(false);
      fetchEventDetails(); // Refresh event data
    } catch (error) {
      console.error("Error canceling registration:", error);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Event Not Found
          </Typography>
          <Typography variant="body2" gutterBottom>
            The event you're looking for doesn't exist or you don't have
            permission to view it.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/events")}
            sx={{ mt: 2 }}
          >
            Back to Events
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Button
          component={RouterLink}
          to="/events"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none" }}
        >
          Events
        </Button>
        <Typography color="text.primary">{event.title}</Typography>
      </Breadcrumbs>

      {/* Event Header */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: event.banner_image
            ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${event.banner_image}) center/cover`
            : "linear-gradient(135deg, #9c27b0 0%, #212121 100%)",
          color: "white",
          borderRadius: 2,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box>
              <Chip
                label={event.event_type.toUpperCase()}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  mb: 2,
                }}
              />
              <Typography variant="h3" fontWeight="700" gutterBottom>
                {event.title}
              </Typography>

              <Box display="flex" flexWrap="wrap" gap={3} sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon />
                  <Typography variant="body1">
                    {format(new Date(event.start_datetime), "MMM dd, yyyy")}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <TimeIcon />
                  <Typography variant="body1">
                    {format(new Date(event.start_datetime), "hh:mm a")} -{" "}
                    {format(new Date(event.end_datetime), "hh:mm a")}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationIcon />
                  <Typography variant="body1">{event.location}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <PeopleIcon />
                  <Typography variant="body1">
                    {event.registration_count} registered
                    {event.max_participants && ` / ${event.max_participants}`}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {event.description.substring(0, 200)}...
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, backgroundColor: "rgba(255, 255, 255, 0.1)" }}>
              <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
                Registration
              </Typography>

              {event.requires_registration ? (
                <>
                  <Box sx={{ mb: 3 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="body2"
                        color="rgba(255, 255, 255, 0.8)"
                      >
                        Registration Progress
                      </Typography>
                      <Typography
                        variant="body2"
                        color="rgba(255, 255, 255, 0.8)"
                      >
                        {event.registration_count}/{event.max_participants}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        (event.registration_count / event.max_participants) *
                        100
                      }
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {isRegistered ? (
                    <Box>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        You are registered for this event
                      </Alert>
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{ borderColor: "white", color: "white" }}
                        onClick={handleCancelRegistration}
                      >
                        Cancel Registration
                      </Button>
                    </Box>
                  ) : event.registration_count >= event.max_participants ? (
                    <Alert severity="warning">
                      Event is full. You can join the waitlist.
                    </Alert>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: "white",
                        color: "primary.main",
                        "&:hover": {
                          backgroundColor: "grey.100",
                        },
                      }}
                      onClick={handleRegister}
                    >
                      Register Now
                    </Button>
                  )}
                </>
              ) : (
                <Alert severity="info" sx={{ color: "white" }}>
                  No registration required for this event
                </Alert>
              )}

              <Box
                sx={{
                  mt: 3,
                  pt: 3,
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 1 }}
                >
                  Organized by
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    src={event.primary_club?.logo}
                    sx={{ width: 40, height: 40 }}
                  >
                    <GroupIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: "white" }}>
                      {event.primary_club?.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.6)" }}
                    >
                      Primary Organizer
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Event Details Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Details" />
          <Tab label="Organizers" />
          <Tab label={`Registered (${event.registration_count})`} />
          <Tab label="Resources" />
          <Tab label="Feedback" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  About This Event
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
                >
                  {event.description}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Event Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Event Type
                  </Typography>
                  <Typography variant="body1">{event.event_type}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Visibility
                  </Typography>
                  <Typography variant="body1">{event.visibility}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={event.status.toUpperCase()}
                    color={
                      event.status === "approved"
                        ? "success"
                        : event.status === "pending"
                          ? "warning"
                          : event.status === "completed"
                            ? "info"
                            : "default"
                    }
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Registration Fee
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ${parseFloat(event.registration_fee).toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Event Organizers
            </Typography>
            <Typography color="text.secondary">
              Organizer information coming soon...
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default EventDetails;
