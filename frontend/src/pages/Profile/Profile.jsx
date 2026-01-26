import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Avatar,
  Button,
  TextField,
  Divider,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";

import api from "../../services/api";
import { fetchProfile, updateProfile } from "../../store/slices/AuthSlice";
import { useAuth } from "../../context/AuthContext";
import FileUpload from "../../components/FileUpload";

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { loading, error } = useSelector((state) => state.auth);

  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [uploadAvatarDialog, setUploadAvatarDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileStats, setProfileStats] = useState({
    eventsAttended: 0,
    clubsJoined: 0,
    resourcesBooked: 0,
    messagesSent: 0,
  });

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const fetchProfileStats = async () => {
    try {
      // Fetch user statistics
      const [eventsRes, clubsRes, bookingsRes, messagesRes] = await Promise.all(
        [
          api.get("/events/?registered=true&status=completed"),
          api.get("/clubs/?member=true"),
          api.get("/resources/bookings/"),
          api.get("/messaging/stats/"),
        ],
      );

      setProfileStats({
        eventsAttended: eventsRes.data.length || 0,
        clubsJoined: clubsRes.data.length || 0,
        resourcesBooked: bookingsRes.data.length || 0,
        messagesSent: messagesRes.data.total || 0,
      });
    } catch (error) {
      console.error("Error fetching profile stats:", error);
    }
  };

  const validationSchema = Yup.object({
    first_name: Yup.string().required("First name is required"),
    last_name: Yup.string().required("Last name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phone_number: Yup.string().matches(
      /^[0-9+\-\s()]*$/,
      "Invalid phone number",
    ),
    department: Yup.string(),
    year: Yup.string(),
    bio: Yup.string().max(500, "Bio must be less than 500 characters"),
    show_email: Yup.boolean(),
    show_phone: Yup.boolean(),
    show_department: Yup.boolean(),
  });

  const handleProfileUpdate = async (values, { setSubmitting }) => {
    try {
      await dispatch(updateProfile(values)).unwrap();
      setEditMode(false);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (files) => {
    try {
      const fileUrl = files[0]?.url;
      if (fileUrl) {
        await dispatch(updateProfile({ profile_picture: fileUrl })).unwrap();
        setUploadAvatarDialog(false);
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
    }
  };

  const handlePasswordChange = async (values, { setSubmitting }) => {
    try {
      await api.post("/auth/change_password/", values);
      setChangePasswordDialog(false);
    } catch (error) {
      console.error("Password change failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const departments = [
    "Computer Science",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Business Administration",
    "Economics",
    "Psychology",
    "English Literature",
    "Other",
  ];

  const years = [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "Graduate",
    "PhD",
    "Faculty",
    "Staff",
  ];

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "error";
      case "organizer":
        return "warning";
      case "participant":
        return "success";
      default:
        return "default";
    }
  };

  const renderProfileInfo = () => (
    <Grid container spacing={3}>
      {/* Left Column - Profile Info */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Box sx={{ position: "relative", display: "inline-block" }}>
            <Avatar
              src={user?.profile_picture}
              sx={{
                width: 150,
                height: 150,
                border: "4px solid",
                borderColor: "primary.main",
                mb: 2,
              }}
            >
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </Avatar>
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                bottom: 10,
                right: 10,
                backgroundColor: "background.paper",
                border: "2px solid",
                borderColor: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.light",
                },
              }}
              onClick={() => setUploadAvatarDialog(true)}
            >
              <UploadIcon fontSize="small" />
            </IconButton>
          </Box>

          <Typography variant="h5" fontWeight="600" gutterBottom>
            {user?.first_name} {user?.last_name}
          </Typography>

          <Chip
            label={user?.role?.toUpperCase()}
            color={getRoleColor(user?.role)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ textAlign: "left", mt: 3 }}>
            <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
              <EmailIcon color="action" />
              <Typography variant="body2">
                {user?.email}
                {!user?.show_email && (
                  <Chip
                    label="Private"
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            </Box>

            {user?.phone_number && (
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <PhoneIcon color="action" />
                <Typography variant="body2">
                  {user?.phone_number}
                  {!user?.show_phone && (
                    <Chip
                      label="Private"
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Box>
            )}

            {user?.department && (
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <SchoolIcon color="action" />
                <Typography variant="body2">
                  {user?.department}
                  {user?.year && `, ${user?.year}`}
                  {!user?.show_department && (
                    <Chip
                      label="Private"
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </Box>
            )}

            <Box display="flex" alignItems="center" gap={2}>
              <CalendarIcon color="action" />
              <Typography variant="body2">
                Joined{" "}
                {user?.created_at
                  ? format(new Date(user.created_at), "MMM dd, yyyy")
                  : "Date not available"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
              disabled={editMode}
            >
              Edit Profile
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SecurityIcon />}
              onClick={() => setChangePasswordDialog(true)}
              sx={{ mt: 1 }}
            >
              Change Password
            </Button>
          </Box>
        </Paper>

        {/* Stats Card */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Activity Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List dense>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "purplePalette.100" }}>
                  <EventIcon color="primary" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Events Attended"
                secondary={profileStats.eventsAttended}
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "purplePalette.100" }}>
                  <GroupIcon color="primary" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Clubs Joined"
                secondary={profileStats.clubsJoined}
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "purplePalette.100" }}>
                  <BusinessIcon color="primary" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Resources Booked"
                secondary={profileStats.resourcesBooked}
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "purplePalette.100" }}>
                  <EmailIcon color="primary" />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Messages Sent"
                secondary={profileStats.messagesSent}
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>

      {/* Right Column - Edit Form or Bio */}
      <Grid item xs={12} md={8}>
        {editMode ? (
          <Paper sx={{ p: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Typography variant="h6">Edit Profile</Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => setEditMode(false)}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error.detail || "Failed to update profile"}
              </Alert>
            )}

            <Formik
              initialValues={{
                first_name: user?.first_name || "",
                last_name: user?.last_name || "",
                email: user?.email || "",
                phone_number: user?.phone_number || "",
                department: user?.department || "",
                year: user?.year || "",
                bio: user?.bio || "",
                show_email: user?.show_email || false,
                show_phone: user?.show_phone || false,
                show_department: user?.show_department || false,
              }}
              validationSchema={validationSchema}
              onSubmit={handleProfileUpdate}
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
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        name="first_name"
                        label="First Name"
                        value={values.first_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.first_name && Boolean(errors.first_name)}
                        helperText={touched.first_name && errors.first_name}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        name="last_name"
                        label="Last Name"
                        value={values.last_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.last_name && Boolean(errors.last_name)}
                        helperText={touched.last_name && errors.last_name}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        name="email"
                        label="Email Address"
                        type="email"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.email && Boolean(errors.email)}
                        helperText={touched.email && errors.email}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        name="phone_number"
                        label="Phone Number"
                        value={values.phone_number}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={
                          touched.phone_number && Boolean(errors.phone_number)
                        }
                        helperText={touched.phone_number && errors.phone_number}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        name="department"
                        label="Department"
                        value={values.department}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.department && Boolean(errors.department)}
                        helperText={touched.department && errors.department}
                        SelectProps={{
                          native: true,
                        }}
                      >
                        <option value=""></option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        name="year"
                        label="Year"
                        value={values.year}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.year && Boolean(errors.year)}
                        helperText={touched.year && errors.year}
                        SelectProps={{
                          native: true,
                        }}
                      >
                        <option value=""></option>
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="bio"
                        label="Bio"
                        multiline
                        rows={4}
                        value={values.bio}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.bio && Boolean(errors.bio)}
                        helperText={touched.bio && errors.bio}
                        placeholder="Tell us about yourself..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Privacy Settings
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Box display="flex" alignItems="center">
                            <input
                              type="checkbox"
                              name="show_email"
                              checked={values.show_email}
                              onChange={handleChange}
                              style={{ marginRight: 8 }}
                            />
                            <Typography variant="body2">Show Email</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box display="flex" alignItems="center">
                            <input
                              type="checkbox"
                              name="show_phone"
                              checked={values.show_phone}
                              onChange={handleChange}
                              style={{ marginRight: 8 }}
                            />
                            <Typography variant="body2">Show Phone</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box display="flex" alignItems="center">
                            <input
                              type="checkbox"
                              name="show_department"
                              checked={values.show_department}
                              onChange={handleChange}
                              style={{ marginRight: 8 }}
                            />
                            <Typography variant="body2">
                              Show Department
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ textAlign: "right" }}>
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
                            "Save Changes"
                          )}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Form>
              )}
            </Formik>
          </Paper>
        ) : (
          <>
            {/* Bio Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                About
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {user?.bio ? (
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {user.bio}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No bio yet. Click "Edit Profile" to add one.
                </Typography>
              )}
            </Paper>

            {/* Activity Tabs */}
            <Paper sx={{ p: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label="Recent Events" />
                <Tab label="Club Memberships" />
                <Tab label="Resource Bookings" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No recent events to show.
                  </Typography>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No club memberships to show.
                  </Typography>
                </Box>
              )}

              {activeTab === 2 && (
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No resource bookings to show.
                  </Typography>
                </Box>
              )}
            </Paper>
          </>
        )}
      </Grid>
    </Grid>
  );

  const renderLoading = () => (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading && !user ? (
        renderLoading()
      ) : (
        <>
          {/* Page Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight="700" gutterBottom>
              My Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your profile information and preferences
            </Typography>
          </Box>

          {renderProfileInfo()}
        </>
      )}

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordDialog}
        onClose={() => setChangePasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <Formik
          initialValues={{
            current_password: "",
            new_password: "",
            confirm_password: "",
          }}
          validationSchema={Yup.object({
            current_password: Yup.string().required(
              "Current password is required",
            ),
            new_password: Yup.string()
              .min(6, "Password must be at least 6 characters")
              .required("New password is required"),
            confirm_password: Yup.string()
              .oneOf([Yup.ref("new_password"), null], "Passwords must match")
              .required("Confirm password is required"),
          })}
          onSubmit={handlePasswordChange}
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
                <TextField
                  fullWidth
                  name="current_password"
                  label="Current Password"
                  type={showPassword ? "text" : "password"}
                  value={values.current_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.current_password && Boolean(errors.current_password)
                  }
                  helperText={
                    touched.current_password && errors.current_password
                  }
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  name="new_password"
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={values.new_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.new_password && Boolean(errors.new_password)}
                  helperText={touched.new_password && errors.new_password}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  name="confirm_password"
                  label="Confirm New Password"
                  type={showPassword ? "text" : "password"}
                  value={values.confirm_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.confirm_password && Boolean(errors.confirm_password)
                  }
                  helperText={
                    touched.confirm_password && errors.confirm_password
                  }
                  sx={{ mb: 2 }}
                />
                <Box display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    style={{ marginRight: 8 }}
                  />
                  <label htmlFor="showPassword">
                    <Typography variant="body2">Show passwords</Typography>
                  </label>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setChangePasswordDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Upload Avatar Dialog */}
      <Dialog
        open={uploadAvatarDialog}
        onClose={() => setUploadAvatarDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Profile Picture</DialogTitle>
        <DialogContent>
          <FileUpload
            onUploadComplete={handleAvatarUpload}
            accept={{
              "image/*": [".png", ".jpg", ".jpeg", ".gif"],
            }}
            maxSize={5 * 1024 * 1024} // 5MB
            multiple={false}
            maxFiles={1}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadAvatarDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
