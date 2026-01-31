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
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Group as GroupIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";

import api from "../../services/api";

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "active",
  });

  useEffect(() => {
    fetchClubs();
  }, [page, filters]);

  const fetchClubs = async () => {
    try {
      setLoading(true);
      console.log("Fetching clubs...");

      // Build query params properly
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.type) params.append("club_type", filters.type);
      if (filters.status) params.append("status", filters.status);

      // If you want to see ALL clubs (including those you created), add this:
      params.append("member", "true"); // This will show clubs you're a member of

      // Add pagination
      params.append("page", page);
      params.append("page_size", 12);

      console.log("Params string:", params.toString());

      const response = await api.get(`/clubs/?${params.toString()}`);
      console.log("API Response:", response);
      console.log("Response data:", response.data);
      console.log(
        "Clubs count:",
        response.data.length || response.data.results?.length,
      );

      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        setClubs(response.data.results);
        setTotalPages(response.data.total_pages || 1);
      } else {
        setClubs(response.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
      console.error("Error response:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (values) => {
    setFilters(values);
    setPage(1);
  };

  const handleCreateClub = async (values, { setSubmitting, resetForm }) => {
    try {
      console.log("=== CREATING CLUB ===");
      console.log("Form values:", values);
      console.log("User token:", localStorage.getItem("token"));

      const response = await api.post("/clubs/", values);

      console.log("API Response:", response);
      console.log("Created club:", response.data);

      setOpenCreateDialog(false);
      resetForm();
      fetchClubs(); // Refresh the list

      // Show success message
      alert("Club created successfully!");
    } catch (error) {
      console.error("=== CLUB CREATION ERROR ===");
      console.error("Error object:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      // Show error to user
      alert(
        `Error creating club: ${error.response?.data?.detail || error.message}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clubTypes = [
    "Academic",
    "Technical",
    "Cultural",
    "Sports",
    "Social",
    "Committee",
    "Other",
  ];

  const validationSchema = Yup.object({
    name: Yup.string().required("Club name is required"),
    description: Yup.string().required("Description is required"),
    club_type: Yup.string().required("Club type is required"),
    email: Yup.string().email("Invalid email"),
  });

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
            Campus Clubs & Committees
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Club
          </Button>
        </Box>

        {/* Search and Filters */}
        <Formik initialValues={filters} onSubmit={handleSearch}>
          {({ values, handleChange, handleSubmit }) => (
            <Form onSubmit={handleSubmit}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="search"
                    placeholder="Search clubs..."
                    value={values.search}
                    onChange={handleChange}
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
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={values.type}
                      label="Type"
                      onChange={handleChange}
                    >
                      <MenuItem value="">All Types</MenuItem>
                      {clubTypes.map((type) => (
                        <MenuItem key={type} value={type.toLowerCase()}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    startIcon={<FilterIcon />}
                    sx={{ height: "56px" }}
                  >
                    Apply Filters
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Box>

      {/* Clubs Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : clubs.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No clubs found. Try different search criteria.
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {clubs.map((club) => (
              <Grid item xs={12} sm={6} md={4} key={club.id}>
                <Card
                  component={Link}
                  to={`/clubs/${club.id}`}
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
                      height: 160,
                      position: "relative",
                      background: club.banner_image
                        ? `url(${club.banner_image}) center/cover`
                        : "linear-gradient(135deg, #9c27b0 0%, #212121 100%)",
                    }}
                  >
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
                        label={club.club_type}
                        size="small"
                        sx={{
                          color: "white",
                          backgroundColor: "rgba(156, 39, 176, 0.8)",
                        }}
                      />
                    </Box>
                  </CardMedia>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      display="flex"
                      alignItems="flex-start"
                      gap={2}
                      sx={{ mb: 2 }}
                    >
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 2,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: club.logo
                            ? `url(${club.logo}) center/cover`
                            : "linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {!club.logo && (
                          <GroupIcon sx={{ color: "white", fontSize: 32 }} />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                          {club.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {club.description.substring(0, 100)}...
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mt: "auto" }}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 2 }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <GroupIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {club.member_count} members
                          </Typography>
                        </Box>
                        {club.is_member && (
                          <Chip label="Member" color="primary" size="small" />
                        )}
                      </Box>

                      <Button
                        variant="outlined"
                        fullWidth
                        component={Link}
                        to={`/clubs/${club.id}`}
                      >
                        View Details
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

      {/* Create Club Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="600">
            Create New Club
          </Typography>
        </DialogTitle>
        <Formik
          initialValues={{
            name: "",
            description: "",
            club_type: "",
            email: "",
            website: "",
            social_links: {},
          }}
          validationSchema={validationSchema}
          onSubmit={handleCreateClub}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isSubmitting,
          }) => (
            <Form>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="name"
                      label="Club Name"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="description"
                      label="Description"
                      multiline
                      rows={4}
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.description && Boolean(errors.description)}
                      helperText={touched.description && errors.description}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Club Type</InputLabel>
                      <Select
                        name="club_type"
                        value={values.club_type}
                        label="Club Type"
                        onChange={handleChange}
                        error={touched.club_type && Boolean(errors.club_type)}
                      >
                        {clubTypes.map((type) => (
                          <MenuItem key={type} value={type.toLowerCase()}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="email"
                      label="Contact Email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="website"
                      label="Website URL"
                      value={values.website}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={() => setOpenCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Club"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </Container>
  );
};

export default Clubs;
