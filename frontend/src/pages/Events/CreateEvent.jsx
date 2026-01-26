import React, { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserClubs();
  }, []);

  const fetchUserClubs = async () => {
    try {
      const response = await api.get("/clubs/?member=true");
      setClubs(response.data);
    } catch (error) {
      console.error("Error fetching clubs:", error);
    }
  };

  const validationSchema = Yup.object({
    title: Yup.string().required("Event title is required"),
    description: Yup.string().required("Description is required"),
    event_type: Yup.string().required("Event type is required"),
    primary_club: Yup.string().required("Primary club is required"),
    organizing_club_ids: Yup.array(),
    location: Yup.string().required("Location is required"),
    start_datetime: Yup.date().required("Start date/time is required"),
    end_datetime: Yup.date()
      .required("End date/time is required")
      .min(Yup.ref("start_datetime"), "End time must be after start time"),
    max_participants: Yup.number().min(1, "Must be at least 1"),
    requires_registration: Yup.boolean(),
    registration_fee: Yup.number().min(0, "Cannot be negative"),
    budget_allocated: Yup.number().min(0, "Cannot be negative"),
  });

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

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setLoading(true);
      setError(null);

      // Format dates for API
      const eventData = {
        ...values,
        start_datetime: values.start_datetime.toISOString(),
        end_datetime: values.end_datetime.toISOString(),
      };

      const response = await api.post("/events/", eventData);
      navigate(`/events/${response.data.id}`);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to create event");
      console.error("Error creating event:", error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
          <Typography color="text.primary">Create Event</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="700" gutterBottom>
            Create New Event
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Fill in the details below to create a new campus event
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Event Form */}
        <Formik
          initialValues={{
            title: "",
            description: "",
            event_type: "",
            primary_club: "",
            organizing_club_ids: [],
            location: "",
            start_datetime: new Date(),
            end_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000), // +2 hours
            max_participants: "",
            requires_registration: false,
            registration_fee: 0,
            budget_allocated: 0,
            visibility: "public",
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            setFieldValue,
            isSubmitting,
          }) => (
            <Form>
              <Paper sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: "primary.main" }}
                    >
                      Basic Information
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="title"
                      label="Event Title"
                      value={values.title}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.title && Boolean(errors.title)}
                      helperText={touched.title && errors.title}
                      placeholder="e.g., Annual Tech Symposium 2024"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="description"
                      label="Event Description"
                      multiline
                      rows={6}
                      value={values.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.description && Boolean(errors.description)}
                      helperText={touched.description && errors.description}
                      placeholder="Describe your event in detail..."
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Event Type</InputLabel>
                      <Select
                        name="event_type"
                        value={values.event_type}
                        label="Event Type"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.event_type && Boolean(errors.event_type)}
                      >
                        <MenuItem value="">
                          <em>Select type</em>
                        </MenuItem>
                        {eventTypes.map((type) => (
                          <MenuItem key={type} value={type.toLowerCase()}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="location"
                      label="Location"
                      value={values.location}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.location && Boolean(errors.location)}
                      helperText={touched.location && errors.location}
                      placeholder="e.g., Main Auditorium, Room 101"
                    />
                  </Grid>

                  {/* Date & Time */}
                  <Grid item xs={12}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: "primary.main", mt: 2 }}
                    >
                      Date & Time
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Start Date"
                      value={values.start_datetime}
                      onChange={(date) => setFieldValue("start_datetime", date)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={
                            touched.start_datetime &&
                            Boolean(errors.start_datetime)
                          }
                          helperText={
                            touched.start_datetime && errors.start_datetime
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TimePicker
                      label="Start Time"
                      value={values.start_datetime}
                      onChange={(time) => setFieldValue("start_datetime", time)}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="End Date"
                      value={values.end_datetime}
                      onChange={(date) => setFieldValue("end_datetime", date)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          error={
                            touched.end_datetime && Boolean(errors.end_datetime)
                          }
                          helperText={
                            touched.end_datetime && errors.end_datetime
                          }
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TimePicker
                      label="End Time"
                      value={values.end_datetime}
                      onChange={(time) => setFieldValue("end_datetime", time)}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  </Grid>

                  {/* Organization */}
                  <Grid item xs={12}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: "primary.main", mt: 2 }}
                    >
                      Organization
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Primary Club *</InputLabel>
                      <Select
                        name="primary_club"
                        value={values.primary_club}
                        label="Primary Club *"
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={
                          touched.primary_club && Boolean(errors.primary_club)
                        }
                      >
                        <MenuItem value="">
                          <em>Select club</em>
                        </MenuItem>
                        {clubs.map((club) => (
                          <MenuItem key={club.id} value={club.id}>
                            {club.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Visibility</InputLabel>
                      <Select
                        name="visibility"
                        value={values.visibility}
                        label="Visibility"
                        onChange={handleChange}
                      >
                        <MenuItem value="public">Public</MenuItem>
                        <MenuItem value="club_only">Club Members Only</MenuItem>
                        <MenuItem value="private">Private</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Registration & Budget */}
                  <Grid item xs={12}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: "primary.main", mt: 2 }}
                    >
                      Registration & Budget
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="requires_registration"
                          checked={values.requires_registration}
                          onChange={handleChange}
                        />
                      }
                      label="Requires Registration"
                    />
                  </Grid>

                  {values.requires_registration && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          name="max_participants"
                          label="Maximum Participants"
                          type="number"
                          value={values.max_participants}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={
                            touched.max_participants &&
                            Boolean(errors.max_participants)
                          }
                          helperText={
                            touched.max_participants && errors.max_participants
                          }
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          name="registration_fee"
                          label="Registration Fee ($)"
                          type="number"
                          value={values.registration_fee}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={
                            touched.registration_fee &&
                            Boolean(errors.registration_fee)
                          }
                          helperText={
                            touched.registration_fee && errors.registration_fee
                          }
                          InputProps={{
                            startAdornment: <span>$</span>,
                          }}
                        />
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="budget_allocated"
                      label="Budget Allocated ($)"
                      type="number"
                      value={values.budget_allocated}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.budget_allocated &&
                        Boolean(errors.budget_allocated)
                      }
                      helperText={
                        touched.budget_allocated && errors.budget_allocated
                      }
                      InputProps={{
                        startAdornment: <span>$</span>,
                      }}
                    />
                  </Grid>

                  {/* Submit Buttons */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 3 }} />
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        variant="outlined"
                        component={RouterLink}
                        to="/events"
                        disabled={loading || isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={loading || isSubmitting}
                        sx={{ minWidth: 120 }}
                      >
                        {loading ? (
                          <CircularProgress size={24} />
                        ) : (
                          "Create Event"
                        )}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Form>
          )}
        </Formik>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateEvent;
