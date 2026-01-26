import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  VideoLibrary as VideoIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import api from "../services/api";

const FileUpload = ({
  onUploadComplete,
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    "application/pdf": [".pdf"],
    "application/msword": [".doc", ".docx"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls", ".xlsx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "text/plain": [".txt"],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  maxFiles = 5,
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length + files.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const newFiles = acceptedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: "pending", // pending, uploading, success, error
        url: null,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files, maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
  });

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const uploadFiles = async () => {
    setUploading(true);
    const formData = new FormData();

    files.forEach((fileData, index) => {
      if (fileData.status === "pending") {
        formData.append(`file_${index}`, fileData.file);
      }
    });

    try {
      const response = await api.post("/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );

          setFiles((prev) =>
            prev.map((file) => ({
              ...file,
              progress: file.status === "pending" ? progress : file.progress,
            })),
          );
        },
      });

      // Update files with URLs
      const uploadedFiles = response.data.files;
      setFiles((prev) =>
        prev.map((file, index) => {
          if (file.status === "pending") {
            const uploadedFile = uploadedFiles[index];
            return {
              ...file,
              status: "success",
              url: uploadedFile.url,
              progress: 100,
            };
          }
          return file;
        }),
      );

      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setFiles((prev) =>
        prev.map((file) => ({
          ...file,
          status: file.status === "pending" ? "error" : file.status,
        })),
      );
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return <ImageIcon />;
    if (type.includes("pdf")) return <DocumentIcon />;
    if (type.includes("video")) return <VideoIcon />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Box>
      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          border: "2px dashed",
          borderColor: isDragActive ? "primary.main" : "divider",
          backgroundColor: isDragActive ? "action.hover" : "background.paper",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            backgroundColor: "action.hover",
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Max {maxFiles} files, {formatFileSize(maxSize)} each
        </Typography>
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <List>
            {files.map((file) => (
              <ListItem
                key={file.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: "background.paper",
                }}
                secondaryAction={
                  file.status !== "uploading" && (
                    <IconButton
                      edge="end"
                      onClick={() => removeFile(file.id)}
                      size="small"
                    >
                      <CloseIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemIcon>{getFileIcon(file.type)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                        {file.name}
                      </Typography>
                      <Chip
                        label={formatFileSize(file.size)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={file.progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          mb: 0.5,
                          backgroundColor:
                            file.status === "error"
                              ? "error.light"
                              : file.status === "success"
                                ? "success.light"
                                : "divider",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor:
                              file.status === "error"
                                ? "error.main"
                                : file.status === "success"
                                  ? "success.main"
                                  : "primary.main",
                          },
                        }}
                      />
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="caption" color="text.secondary">
                          {file.status === "pending" && "Ready to upload"}
                          {file.status === "uploading" && "Uploading..."}
                          {file.status === "success" && "Uploaded"}
                          {file.status === "error" && "Upload failed"}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {file.status === "success" && (
                            <SuccessIcon color="success" fontSize="small" />
                          )}
                          {file.status === "error" && (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {file.progress}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>

          {/* Upload Button */}
          {files.some((f) => f.status === "pending") && (
            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Button
                variant="contained"
                onClick={uploadFiles}
                disabled={uploading}
                startIcon={<UploadIcon />}
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;
