import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Alert,
} from "@mui/material";
import {
  Event as EventIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
  ArrowForward as ArrowForwardIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const Dashboard = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    events: 0,
    clubs: 0,
    resources: 0,
    notifications: 0,
    upcomingEvents: [],
    recentClubs: [],
    activityData: null,
    clubDistribution: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch data if authenticated
    if (isAuthenticated) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching dashboard data...");

      // Make API calls in parallel
      const [eventsRes, clubsRes, resourcesRes, notificationsRes] =
        await Promise.all([
          api.get("/events/upcoming/"),
          api.get("/clubs/"),
          api.get("/resources/"),
          api.get("/notifications/count/"),
        ]);

      console.log("API responses received successfully");

      // Prepare chart data
      const activityData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "User Activity",
            data: [12, 19, 3, 5, 2, 3, 15],
            borderColor: "#9c27b0",
            backgroundColor: "rgba(156, 39, 176, 0.2)",
            tension: 0.4,
          },
        ],
      };

      const clubDistribution = {
        labels: ["Academic", "Technical", "Cultural", "Sports", "Social"],
        datasets: [
          {
            data: [12, 19, 3, 5, 2],
            backgroundColor: [
              "#9c27b0",
              "#ba68c8",
              "#7b1fa2",
              "#4a148c",
              "#e1bee7",
            ],
            borderWidth: 1,
          },
        ],
      };

      // Update state with API data
      setStats({
        events: eventsRes.data?.length || 0,
        clubs: clubsRes.data?.length || 0,
        resources: resourcesRes.data?.length || 0,
        notifications: notificationsRes.data?.unread || 0,
        upcomingEvents: eventsRes.data?.slice(0, 5) || [],
        recentClubs: clubsRes.data?.slice(0, 5) || [],
        activityData,
        clubDistribution,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error.response?.data?.detail || "Failed to load dashboard data");

      // If auth error, redirect to login
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ height: "60vh" }}
        >
          <LinearProgress sx={{ width: "100%", maxWidth: 400 }} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Please Login
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            You need to be logged in to view the dashboard.
          </Typography>
          <Button
            component={Link}
            to="/login"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  // Show error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Retry
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchDashboardData} sx={{ mt: 2 }}>
          Refresh Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: "linear-gradient(135deg, #212121 0%, #424242 100%)",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              Welcome back,{" "}
              {user ? user.first_name || user.username || "User" : "User"}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Here's what's happening in your campus community today.
            </Typography>
          </Box>
          <Chip
            label={(user?.role || "USER").toUpperCase()}
            color="primary"
            sx={{ fontWeight: 600, px: 1 }}
          />
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Events
                  </Typography>
                  <Typography variant="h4">{stats.events}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <EventIcon />
                </Avatar>
              </Box>
              <Button
                component={Link}
                to="/events"
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 2 }}
              >
                View All
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Clubs
                  </Typography>
                  <Typography variant="h4">{stats.clubs}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "secondary.main" }}>
                  <GroupIcon />
                </Avatar>
              </Box>
              <Button
                component={Link}
                to="/clubs"
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 2 }}
              >
                Browse Clubs
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Available Resources
                  </Typography>
                  <Typography variant="h4">{stats.resources}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "success.main" }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
              <Button
                component={Link}
                to="/resources"
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 2 }}
              >
                Book Resources
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Notifications
                  </Typography>
                  <Typography variant="h4">{stats.notifications}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "warning.main" }}>
                  <NotificationsIcon />
                </Avatar>
              </Box>
              <Button
                component={Link}
                to="/notifications"
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{ mt: 2 }}
              >
                Check Notifications
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title="Weekly Activity"
              action={
                <IconButton>
                  <TrendingUpIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Box sx={{ height: 300 }}>
                {stats.activityData && stats.activityData.datasets ? (
                  <Line
                    data={stats.activityData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: "#ffffff",
                          },
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                          },
                          ticks: {
                            color: "#b0b0b0",
                          },
                        },
                        y: {
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                          },
                          ticks: {
                            color: "#b0b0b0",
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ height: "100%" }}
                  >
                    <Typography color="text.secondary">
                      No activity data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Club Distribution"
              action={
                <IconButton>
                  <PeopleIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Box sx={{ height: 300 }}>
                {stats.clubDistribution && stats.clubDistribution.datasets ? (
                  <Doughnut
                    data={stats.clubDistribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: "#ffffff",
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    sx={{ height: "100%" }}
                  >
                    <Typography color="text.secondary">
                      No club distribution data
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Upcoming Events"
              action={
                <Button component={Link} to="/events" size="small">
                  View All
                </Button>
              }
            />
            <Divider />
            <List>
              {stats.upcomingEvents && stats.upcomingEvents.length > 0 ? (
                stats.upcomingEvents.map((event) => (
                  <ListItem
                    key={event.id}
                    component={Link}
                    to={`/events/${event.id}`}
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "primary.main" }}>
                        <CalendarIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={event.title || "Untitled Event"}
                      secondary={`${event.start_datetime ? new Date(event.start_datetime).toLocaleDateString() : "Date TBA"} • ${event.location || "Location TBA"}`}
                    />
                    <Chip
                      label={event.event_type || "General"}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No upcoming events"
                    secondary="Check back later for new events"
                  />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Recent Clubs"
              action={
                <Button component={Link} to="/clubs" size="small">
                  View All
                </Button>
              }
            />
            <Divider />
            <List>
              {stats.recentClubs && stats.recentClubs.length > 0 ? (
                stats.recentClubs.map((club) => (
                  <ListItem
                    key={club.id}
                    component={Link}
                    to={`/clubs/${club.id}`}
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={club.logo}
                        sx={{ bgcolor: "secondary.main" }}
                      >
                        <GroupIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={club.name || "Unnamed Club"}
                      secondary={`${club.club_type || "General"} • ${club.member_count || 0} members`}
                    />
                    {club.is_member && (
                      <Chip
                        label="Member"
                        color="primary"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No clubs available"
                    secondary="Join clubs to see them here"
                  />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
