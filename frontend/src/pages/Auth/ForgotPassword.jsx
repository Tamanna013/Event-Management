import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { Formik, Form } from "formik";
import * as Yup from "yup";

import api from "../../services/api";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const steps = ["Enter Email", "Verify OTP", "Reset Password"];

  const emailValidationSchema = Yup.object({
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
  });

  const otpValidationSchema = Yup.object({
    otp: Yup.string()
      .length(6, "OTP must be 6 digits")
      .required("OTP is required"),
  });

  const passwordValidationSchema = Yup.object({
    new_password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    confirm_password: Yup.string()
      .oneOf([Yup.ref("new_password"), null], "Passwords must match")
      .required("Confirm password is required"),
  });

  const handleRequestOTP = async (values) => {
    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/request_otp/", {
        email: values.email,
        purpose: "password_reset",
      });
      setEmail(values.email);
      setStep(2);
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values) => {
    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/verify_otp/", {
        email,
        otp_code: values.otp,
        purpose: "password_reset",
      });
      setStep(3);
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    setLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset_password/", {
        email,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 1:
        return (
          <Formik
            initialValues={{ email: "" }}
            validationSchema={emailValidationSchema}
            onSubmit={handleRequestOTP}
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || isSubmitting}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Send Reset Code"}
                </Button>
              </Form>
            )}
          </Formik>
        );

      case 2:
        return (
          <Formik
            initialValues={{ otp: "" }}
            validationSchema={otpValidationSchema}
            onSubmit={handleVerifyOTP}
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  We sent a 6-digit code to {email}
                </Typography>
                <TextField
                  fullWidth
                  name="otp"
                  label="Enter OTP"
                  value={values.otp}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.otp && Boolean(errors.otp)}
                  helperText={touched.otp && errors.otp}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || isSubmitting}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Verify Code"}
                </Button>
              </Form>
            )}
          </Formik>
        );

      case 3:
        return (
          <Formik
            initialValues={{ new_password: "", confirm_password: "" }}
            validationSchema={passwordValidationSchema}
            onSubmit={handleResetPassword}
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
                <TextField
                  fullWidth
                  name="new_password"
                  label="New Password"
                  type="password"
                  value={values.new_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.new_password && Boolean(errors.new_password)}
                  helperText={touched.new_password && errors.new_password}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  name="confirm_password"
                  label="Confirm Password"
                  type="password"
                  value={values.confirm_password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.confirm_password && Boolean(errors.confirm_password)
                  }
                  helperText={
                    touched.confirm_password && errors.confirm_password
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || isSubmitting}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Reset Password"}
                </Button>
              </Form>
            )}
          </Formik>
        );

      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo/Title */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 1,
            }}
          >
            CampusHub
          </Typography>
          <Typography variant="h5" gutterBottom>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Follow the steps to reset your password
          </Typography>
        </Box>

        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: "100%",
            background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)",
          }}
        >
          {/* Stepper */}
          <Stepper activeStep={step - 1} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Success Message */}
          {success && step === 3 && (
            <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3 }}>
              Password reset successfully! Redirecting to login...
            </Alert>
          )}

          {/* Step Content */}
          {renderStepContent(step)}

          {/* Back Button */}
          {step > 1 && step < 3 && (
            <Button
              fullWidth
              variant="text"
              onClick={() => setStep(step - 1)}
              sx={{ mt: 2 }}
            >
              Go Back
            </Button>
          )}

          {/* Login Link */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Remember your password?{" "}
              <Link
                component={RouterLink}
                to="/login"
                sx={{ color: "purplePalette.300" }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
