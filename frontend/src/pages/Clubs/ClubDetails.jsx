import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  CardMedia,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Group as GroupIcon,
  Event as EventIcon,
  Description as DocumentIcon,
  Announcement as AnnouncementIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Language as LanguageIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import { format } from "date-fns";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import FileUpload from "../../components/FileUpload";

const ClubDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [createEventDialog, setCreateEventDialog] = useState(false);
  const [uploadDocumentDialog, setUploadDocumentDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchClubDetails();
  }, [id]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);
      const [clubRes, membersRes, eventsRes, docsRes, announcementsRes] =
        await Promise.all([
          api.get(`/clubs/${id}/`),
          api.get(`/clubs/${id}/members/`),
          api.get("/events/", { params: { club: id } }),
          api.get(`/clubs/${id}/documents/`),
          api.get(`/clubs/${id}/announcements/`),
        ]);

      setClub(clubRes.data);
      setMembers(membersRes.data);
      setEvents(eventsRes.data);
      setDocuments(docsRes.data);
      setAnnouncements(announcementsRes.data);
      setUserRole(clubRes.data.user_role);
    } catch (error) {
      setError("Failed to load club details");
      console.error("Error fetching club details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    try {
      await api.post(`/clubs/${id}/join/`);
      fetchClubDetails(); // Refresh club data
    } catch (error) {
      console.error("Error joining club:", error);
    }
  };

  const handleInviteMember = async (email, role) => {
    try {
      await api.post(`/clubs/${id}/invite/`, { email, role });
      setInviteDialog(false);
    } catch (error) {
      console.error("Error inviting member:", error);
    }
  };

  const handleUploadDocument = async (files) => {
    try {
      // Upload file first
      const formData = new FormData();
      formData.append("file", files[0].file);

      const uploadRes = await api.post("/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Create document record
      await api.post(`/clubs/${id}/documents/`, {
        title: files[0].name,
        file_url: uploadRes.data.files[0].url,
        document_type: "other",
        is_public: true,
      });

      setUploadDocumentDialog(false);
      fetchClubDetails(); // Refresh documents
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  const handleCreateAnnouncement = async (title, content) => {
    try {
      await api.post(`/clubs/${id}/announcements/`, {
        title,
        content,
        is_pinned: false,
      });
      fetchClubDetails(); // Refresh announcements
    } catch (error) {
      console.error("Error creating announcement:", error);
    }
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const isClubAdmin = () => {
    return (
      userRole === "head" ||
      userRole === "coordinator" ||
      user?.role === "admin"
    );
  };

  const renderClubHeader = () => (
    <Paper
      sx={{
        p: 4,
        mb: 3,
        background: club?.banner_image
          ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${club.banner_image}) center/cover`
          : "linear-gradient(135deg, #9c27b0 0%, #212121 100%)",
        color: "white",
        borderRadius: 2,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Avatar
            src={club?.logo}
            sx={{
              width: 120,
              height: 120,
              border: "4px solid white",
              backgroundColor: "white",
            }}
          >
            <GroupIcon sx={{ fontSize: 60, color: "primary.main" }} />
          </Avatar>
          <Box>
            <Typography variant="h3" fontWeight="700" gutterBottom>
              {club?.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
              <Chip
                label={club?.club_type?.toUpperCase()}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`${club?.member_count || 0} members`}
                icon={<GroupIcon />}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                }}
              />
              {userRole && (
                <Chip
                  label={userRole.toUpperCase()}
                  sx={{
                    backgroundColor: "primary.main",
                    color: "white",
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 600 }}>
              {club?.description}
            </Typography>
          </Box>
        </Box>

        <Box>
          <IconButton
            onClick={handleMenuOpen}
            sx={{ color: "white", backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>
              <ShareIcon sx={{ mr: 1 }} />
              Share Club
            </MenuItem>
            {isClubAdmin() && (
              <>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    setInviteDialog(true);
                  }}
                >
                  <PersonAddIcon sx={{ mr: 1 }} />
                  Invite Member
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    setCreateEventDialog(true);
                  }}
                >
                  <EventIcon sx={{ mr: 1 }} />
                  Create Event
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleMenuClose}>
                  <EditIcon sx={{ mr: 1 }} />
                  Edit Club
                </MenuItem>
                <MenuItem
                  onClick={handleMenuClose}
                  sx={{ color: "error.main" }}
                >
                  <DeleteIcon sx={{ mr: 1 }} />
                  Delete Club
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Contact Info */}
      {(club?.email || club?.website || club?.social_links) && (
        <Box
          sx={{ mt: 3, pt: 3, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
            Contact & Links
          </Typography>
          <Box display="flex" gap={3}>
            {club?.email && (
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon />
                <Typography variant="body2">{club.email}</Typography>
              </Box>
            )}
            {club?.website && (
              <Box display="flex" alignItems="center" gap={1}>
                <LanguageIcon />
                <a
                  href={club.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "white", textDecoration: "none" }}
                >
                  <Typography variant="body2">Website</Typography>
                </a>
              </Box>
            )}
            {club?.social_links?.facebook && (
              <IconButton
                component="a"
                href={club.social_links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: "white" }}
              >
                <FacebookIcon />
              </IconButton>
            )}
            {club?.social_links?.instagram && (
              <IconButton
                component="a"
                href={club.social_links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: "white" }}
              >
                <InstagramIcon />
              </IconButton>
            )}
            {club?.social_links?.twitter && (
              <IconButton
                component="a"
                href={club.social_links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: "white" }}
              >
                <TwitterIcon />
              </IconButton>
            )}
            {club?.social_links?.linkedin && (
              <IconButton
                component="a"
                href={club.social_links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: "white" }}
              >
                <LinkedInIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
        {!userRole ? (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleJoinClub}
            sx={{
              backgroundColor: "white",
              color: "primary.main",
              "&:hover": {
                backgroundColor: "grey.100",
              },
            }}
          >
            Join Club
          </Button>
        ) : (
          <Button
            variant="outlined"
            sx={{ borderColor: "white", color: "white" }}
            startIcon={<GroupIcon />}
          >
            Member
          </Button>
        )}

        {isClubAdmin() && (
          <>
            <Button
              variant="outlined"
              sx={{ borderColor: "white", color: "white" }}
              startIcon={<SettingsIcon />}
              component={RouterLink}
              to={`/clubs/${id}/manage`}
            >
              Manage
            </Button>
            <Button
              variant="outlined"
              sx={{ borderColor: "white", color: "white" }}
              startIcon={<AnnouncementIcon />}
              onClick={() => {
                /* Open announcement dialog */
              }}
            >
              Post Announcement
            </Button>
          </>
        )}

        <Button
          variant="text"
          sx={{ color: "white" }}
          startIcon={<CalendarIcon />}
          component={RouterLink}
          to={`/events?club=${id}`}
        >
          View Events
        </Button>
      </Box>
    </Paper>
  );

  const renderMembersTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Members ({members.length})
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <List>
            {members.map((member) => (
              <ListItem
                key={member.id}
                secondaryAction={
                  <Chip
                    label={member.role}
                    size="small"
                    color={
                      member.role === "head"
                        ? "error"
                        : member.role === "coordinator"
                          ? "warning"
                          : "default"
                    }
                  />
                }
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <ListItemAvatar>
                  <Avatar src={member.user?.profile_picture}>
                    {member.user?.first_name?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${member.user?.first_name} ${member.user?.last_name}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {member.user?.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Joined{" "}
                        {format(new Date(member.joined_at), "MMM dd, yyyy")}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Member Statistics
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Heads
            </Typography>
            <Typography variant="h5">
              {members.filter((m) => m.role === "head").length}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Coordinators
            </Typography>
            <Typography variant="h5">
              {members.filter((m) => m.role === "coordinator").length}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Members
            </Typography>
            <Typography variant="h5">
              {members.filter((m) => m.role === "member").length}
            </Typography>
          </Box>

          {isClubAdmin() && (
            <Button
              fullWidth
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setInviteDialog(true)}
              sx={{ mt: 3 }}
            >
              Invite New Member
            </Button>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderEventsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Typography variant="h6">
            Upcoming Events (
            {
              events.filter((e) => new Date(e.start_datetime) > new Date())
                .length
            }
            )
          </Typography>
          {isClubAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateEventDialog(true)}
            >
              Create Event
            </Button>
          )}
        </Box>
      </Grid>

      {events.length === 0 ? (
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <EventIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography color="text.secondary" gutterBottom>
              No events scheduled yet
            </Typography>
            {isClubAdmin() && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCreateEventDialog(true)}
                sx={{ mt: 2 }}
              >
                Create First Event
              </Button>
            )}
          </Paper>
        </Grid>
      ) : (
        events.map((event) => (
          <Grid item xs={12} md={6} lg={4} key={event.id}>
            <Card
              component={RouterLink}
              to={`/events/${event.id}`}
              sx={{
                textDecoration: "none",
                color: "inherit",
                height: "100%",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
            >
              <CardMedia
                component="div"
                sx={{
                  height: 140,
                  background: event.banner_image
                    ? `url(${event.banner_image}) center/cover`
                    : "linear-gradient(135deg, #9c27b0 0%, #212121 100%)",
                }}
              />
              <CardContent>
                <Typography variant="h6" gutterBottom noWrap>
                  {event.title}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <CalendarIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {format(
                      new Date(event.start_datetime),
                      "MMM dd, yyyy • hh:mm a",
                    )}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body2" noWrap>
                    {event.location}
                  </Typography>
                </Box>
                <Chip label={event.event_type} size="small" sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {event.description.substring(0, 100)}...
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">
                  View Details
                </Button>
                {event.requires_registration && (
                  <Button size="small" variant="outlined">
                    Register
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

  const renderDocumentsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Typography variant="h6">Documents ({documents.length})</Typography>
          {isClubAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUploadDocumentDialog(true)}
            >
              Upload Document
            </Button>
          )}
        </Box>
      </Grid>

      {documents.length === 0 ? (
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <DocumentIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
            />
            <Typography color="text.secondary" gutterBottom>
              No documents uploaded yet
            </Typography>
            {isClubAdmin() && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setUploadDocumentDialog(true)}
                sx={{ mt: 2 }}
              >
                Upload First Document
              </Button>
            )}
          </Paper>
        </Grid>
      ) : (
        documents.map((doc) => (
          <Grid item xs={12} md={6} key={doc.id}>
            <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "purplePalette.100" }}>
                <DocumentIcon color="primary" />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {doc.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {doc.document_type} •{" "}
                  {format(new Date(doc.created_at), "MMM dd, yyyy")}
                </Typography>
              </Box>
              <Button
                component="a"
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
              >
                Download
              </Button>
            </Paper>
          </Grid>
        ))
      )}
    </Grid>
  );

  const renderAnnouncementsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Typography variant="h6">
            Announcements ({announcements.length})
          </Typography>
          {isClubAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                /* Open announcement dialog */
              }}
            >
              New Announcement
            </Button>
          )}
        </Box>
      </Grid>

      {announcements.length === 0 ? (
        <Grid item xs={12}>
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <AnnouncementIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
            />
            <Typography color="text.secondary" gutterBottom>
              No announcements yet
            </Typography>
          </Paper>
        </Grid>
      ) : (
        announcements.map((announcement) => (
          <Grid item xs={12} key={announcement.id}>
            <Paper sx={{ p: 3 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {announcement.title}
                    {announcement.is_pinned && (
                      <Chip
                        label="Pinned"
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    By {announcement.created_by?.first_name} •{" "}
                    {format(
                      new Date(announcement.created_at),
                      "MMM dd, yyyy • hh:mm a",
                    )}
                  </Typography>
                </Box>
                {isClubAdmin() && (
                  <IconButton size="small">
                    <MoreVertIcon />
                  </IconButton>
                )}
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {announcement.content}
              </Typography>
            </Paper>
          </Grid>
        ))
      )}
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

  const renderError = () => (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <Alert severity="error" sx={{ maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>
          Club Not Found
        </Typography>
        <Typography variant="body2" gutterBottom>
          The club you're looking for doesn't exist or you don't have permission
          to view it.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/clubs")}
          sx={{ mt: 2 }}
        >
          Back to Clubs
        </Button>
      </Alert>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Button
          component={RouterLink}
          to="/clubs"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none" }}
        >
          Clubs
        </Button>
        <Typography color="text.primary">
          {club?.name || "Club Details"}
        </Typography>
      </Breadcrumbs>

      {loading ? (
        renderLoading()
      ) : error || !club ? (
        renderError()
      ) : (
        <>
          {renderClubHeader()}

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" />
              <Tab label={`Members (${members.length})`} />
              <Tab label={`Events (${events.length})`} />
              <Tab label={`Documents (${documents.length})`} />
              <Tab label={`Announcements (${announcements.length})`} />
              {isClubAdmin() && <Tab label="Management" />}
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Box sx={{ mt: 3 }}>
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      About {club.name}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
                    >
                      {club.description}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Quick Stats
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Members
                      </Typography>
                      <Typography variant="h4">
                        {club.member_count || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Events This Month
                      </Typography>
                      <Typography variant="h4">
                        {
                          events.filter((e) => {
                            const eventDate = new Date(e.start_datetime);
                            const now = new Date();
                            return (
                              eventDate.getMonth() === now.getMonth() &&
                              eventDate.getFullYear() === now.getFullYear()
                            );
                          }).length
                        }
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Club Status
                      </Typography>
                      <Chip
                        label={club.status.toUpperCase()}
                        color={club.status === "active" ? "success" : "default"}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
            {activeTab === 1 && renderMembersTab()}
            {activeTab === 2 && renderEventsTab()}
            {activeTab === 3 && renderDocumentsTab()}
            {activeTab === 4 && renderAnnouncementsTab()}
            {activeTab === 5 && isClubAdmin() && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Club Management
                </Typography>
                <Typography color="text.secondary">
                  Advanced management features coming soon...
                </Typography>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* Invite Member Dialog */}
      <Dialog
        open={inviteDialog}
        onClose={() => setInviteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invite Member</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            margin="normal"
          />
          <TextField
            select
            fullWidth
            label="Role"
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="member">Member</option>
            <option value="coordinator">Coordinator</option>
            <option value="head">Head</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleInviteMember("test@email.com", "member")}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog
        open={uploadDocumentDialog}
        onClose={() => setUploadDocumentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <FileUpload
            onUploadComplete={handleUploadDocument}
            accept={{
              "application/pdf": [".pdf"],
              "application/msword": [".doc", ".docx"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                [".docx"],
              "application/vnd.ms-excel": [".xls", ".xlsx"],
              "text/plain": [".txt"],
            }}
            maxSize={10 * 1024 * 1024} // 10MB
            multiple={false}
            maxFiles={1}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDocumentDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ClubDetails;
