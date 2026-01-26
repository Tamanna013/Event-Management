import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
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
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Business as BusinessIcon,
  MeetingRoom as RoomIcon,
  Build as EquipmentIcon,
  DirectionsCar as VehicleIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
  AccessTime as TimeIcon,
  Group as CapacityIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { format } from "date-fns";

import api from "../../services/api";

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resourceType, setResourceType] = useState("all");
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "available",
  });

  useEffect(() => {
    fetchResources();
  }, [page, resourceType, filters]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: 12,
        resource_type: resourceType === "all" ? "" : resourceType,
        ...filters,
      };
      const response = await api.get("/resources/", { params });
      setResources(response.data.results || response.data);
      setTotalPages(response.data.total_pages || 1);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const resourceTypes = [
    { value: "room", label: "Rooms & Halls", icon: <RoomIcon /> },
    { value: "equipment", label: "Equipment", icon: <EquipmentIcon /> },
    { value: "vehicle", label: "Vehicles", icon: <VehicleIcon /> },
    { value: "other", label: "Other", icon: <BusinessIcon /> },
  ];

  const getResourceIcon = (type) => {
    const resourceType = resourceTypes.find((rt) => rt.value === type);
    return resourceType ? resourceType.icon : <BusinessIcon />;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "success";
      case "in_use":
        return "warning";
      case "maintenance":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return <AvailableIcon />;
      case "in_use":
        return <TimeIcon />;
      case "maintenance":
        return <UnavailableIcon />;
      default:
        return <BusinessIcon />;
    }
  };

  const getBookingTypeLabel = (type) => {
    switch (type) {
      case "auto":
        return "Auto-Approved";
      case "manual":
        return "Requires Approval";
      default:
        return type;
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
            Campus Resources
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/resources/categories"
            startIcon={<FilterIcon />}
          >
            Manage Categories
          </Button>
        </Box>

        {/* Resource Type Toggle */}
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={resourceType}
            exclusive
            onChange={(e, newType) => newType && setResourceType(newType)}
            sx={{ flexWrap: "wrap", gap: 1 }}
          >
            <ToggleButton value="all">
              <BusinessIcon sx={{ mr: 1 }} />
              All Resources
            </ToggleButton>
            {resourceTypes.map((type) => (
              <ToggleButton key={type.value} value={type.value}>
                {type.icon}
                <Box component="span" sx={{ ml: 1 }}>
                  {type.label}
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search resources..."
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
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="in_use">In Use</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="all">All Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Booking Type</InputLabel>
              <Select
                value={filters.booking_type}
                label="Booking Type"
                onChange={(e) =>
                  setFilters({ ...filters, booking_type: e.target.value })
                }
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="auto">Auto-Approved</MenuItem>
                <MenuItem value="manual">Requires Approval</MenuItem>
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
                setFilters({
                  search: "",
                  status: "available",
                  booking_type: "",
                })
              }
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Resources Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No resources found. Try different filters.
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {resources.map((resource) => (
              <Grid item xs={12} sm={6} md={4} key={resource.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: (theme) => theme.shadows[8],
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Resource Header */}
                    <Box
                      display="flex"
                      alignItems="flex-start"
                      gap={2}
                      sx={{ mb: 2 }}
                    >
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: "purplePalette.500",
                        }}
                      >
                        {getResourceIcon(resource.resource_type)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                          {resource.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            icon={getStatusIcon(resource.status)}
                            label={resource.status.toUpperCase()}
                            color={getStatusColor(resource.status)}
                            size="small"
                          />
                          <Chip
                            label={getBookingTypeLabel(resource.booking_type)}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Box>

                    {/* Resource Details */}
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {resource.description?.substring(0, 120)}...
                      </Typography>

                      <Grid container spacing={1}>
                        {resource.location && (
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LocationIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {resource.location}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        {resource.capacity && (
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <CapacityIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                Capacity: {resource.capacity}
                              </Typography>
                            </Box>
                          </Grid>
                        )}

                        <Grid item xs={6}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <CalendarIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              Max: {resource.max_booking_duration}h
                            </Typography>
                          </Box>
                        </Grid>

                        {resource.category && (
                          <Grid item xs={12}>
                            <Chip
                              label={resource.category.name}
                              size="small"
                              variant="outlined"
                            />
                          </Grid>
                        )}
                      </Grid>
                    </Box>

                    {/* Action Buttons */}
                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained"
                        fullWidth
                        component={Link}
                        to={`/resources/${resource.id}`}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        component={Link}
                        to={`/resources/book/${resource.id}`}
                        disabled={resource.status !== "available"}
                      >
                        Book Now
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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

export default Resources;
