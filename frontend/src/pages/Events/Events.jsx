import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  Sort as SortIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { format, isFuture, isPast } from "date-fns";

import api from "../../services/api";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState("all"); // all, upcoming, past, my
  const [sort, setSort] = useState("newest");
  const [filters, setFilters] = useState({
    search: "",
    event_type: "",
    club: "",
  });

  useEffect(() => {
    fetchEvents();
  }, [page, view, sort, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: 12,
        ordering: sort === "newest" ? "-created_at" : "start_datetime",
        ...filters,
      };

      let endpoint = "/events/";
      if (view === "upcoming") endpoint = "/events/upcoming/";
      if (view === "past") endpoint = "/events/past/";
      if (view === "my") endpoint = "/events/my-events/";

      const response = await api.get(endpoint, { params });
      setEvents(response.data.results || response.data);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = [
    "Workshop",
    "Seminar",
    "Conference",
    "Competition",
    "Cultural",
    "Sports",
    "Social",
    "Meeting",
    "Other",
  ];

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);

    if (event.status !== "approved") return event.status;
    if (isFuture(start)) return "upcoming";
    if (isPast(start) && isFuture(end)) return "ongoing";
    return "past";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "upcoming":
        return "success";
      case "ongoing":
        return "warning";
      case "approved":
        return "info";
      case "pending":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Typography variant="h4" fontWeight="700">
            Campus Events
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/events/create"
            startIcon={<EventIcon />}
          >
            Create Event
          </Button>
        </Box>

        {/* View Toggle */}
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(e, newView) => newView && setView(newView)}
            sx={{ flexWrap: "wrap", gap: 1 }}
          >
            <ToggleButton value="all">All Events</ToggleButton>
            <ToggleButton value="upcoming">Upcoming</ToggleButton>
            <ToggleButton value="ongoing">Ongoing</ToggleButton>
            <ToggleButton value="past">Past Events</ToggleButton>
            <ToggleButton value="my">My Events</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filters.event_type}
                label="Event Type"
                onChange={(e) =>
                  setFilters({ ...filters, event_type: e.target.value })
                }
              >
                <MenuItem value="">All Types</MenuItem>
                {eventTypes.map((type) => (
                  <MenuItem key={type} value={type.toLowerCase()}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sort}
                label="Sort By"
                onChange={(e) => setSort(e.target.value)}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="date">Event Date</MenuItem>
                <MenuItem value="popular">Most Popular</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FilterIcon />}
              sx={{ height: "56px" }}
              onClick={() =>
                setFilters({ search: "", event_type: "", club: "" })
              }
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Events Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : events.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No events found. Try different filters or create a new event.
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {events.map((event) => {
              const status = getEventStatus(event);
              const isFull =
                event.max_participants &&
                event.registration_count >= event.max_participants;

              return (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <Card
                    component={Link}
                    to={`/events/${event.id}`}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      textDecoration: "none",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: (theme) => theme.shadows[8],
                      },
                    }}
                  >
                    <CardMedia
                      component="div"
                      sx={{
                        height: 200,
                        position: "relative",
                        background: event.banner_image
                          ? `url(${event.banner_image}) center/cover`
                          : "linear-gradient(135deg, #9c27b0 0%, #212121 100%)",
                      }}
                    >
                      {/* Status Badge */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 16,
                          left: 16,
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                        }}
                      >
                        <Chip
                          label={status.toUpperCase()}
                          size="small"
                          color={getStatusColor(status)}
                          sx={{ color: "white" }}
                        />
                      </Box>

                      {/* Full Badge */}
                      {isFull && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            backgroundColor: "rgba(244, 67, 54, 0.9)",
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                          }}
                        >
                          <Chip
                            label="FULL"
                            size="small"
                            sx={{ color: "white" }}
                          />
                        </Box>
                      )}

                      {/* Event Type */}
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 16,
                          left: 16,
                        }}
                      >
                        <Chip
                          label={event.event_type}
                          size="small"
                          sx={{
                            backgroundColor: "rgba(156, 39, 176, 0.8)",
                            color: "white",
                          }}
                        />
                      </Box>
                    </CardMedia>

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        gutterBottom
                        noWrap
                      >
                        {event.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {event.description.substring(0, 120)}...
                      </Typography>

                      {/* Event Details */}
                      <Box sx={{ mb: 2 }}>
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{ mb: 1 }}
                        >
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {format(
                              new Date(event.start_datetime),
                              "MMM dd, yyyy",
                            )}
                          </Typography>
                          <TimeIcon
                            fontSize="small"
                            color="action"
                            sx={{ ml: 1 }}
                          />
                          <Typography variant="body2">
                            {format(new Date(event.start_datetime), "hh:mm a")}
                          </Typography>
                        </Box>

                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{ mb: 1 }}
                        >
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2" noWrap>
                            {event.location}
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                          <PeopleIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {event.registration_count || 0} registered
                            {event.max_participants &&
                              ` / ${event.max_participants}`}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Action Buttons */}
                      <Box display="flex" gap={1}>
                        <Button
                          variant="contained"
                          fullWidth
                          component={Link}
                          to={`/events/${event.id}`}
                        >
                          View Details
                        </Button>
                        {event.requires_registration &&
                          !event.is_registered &&
                          !isFull && (
                            <Button
                              variant="outlined"
                              fullWidth
                              component={Link}
                              to={`/events/${event.id}/register`}
                            >
                              Register
                            </Button>
                          )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default Events;
