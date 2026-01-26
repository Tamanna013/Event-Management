import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#9c27b0", // Purple
      light: "#af52bf",
      dark: "#7b1fa2",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#212121", // Dark grey/black
      light: "#484848",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b0b0b0",
    },
    purplePalette: {
      50: "#f3e5f5",
      100: "#e1bee7",
      200: "#ce93d8",
      300: "#ba68c8",
      400: "#ab47bc",
      500: "#9c27b0",
      600: "#8e24aa",
      700: "#7b1fa2",
      800: "#6a1b9a",
      900: "#4a148c",
    },
    success: {
      main: "#4caf50",
    },
    warning: {
      main: "#ff9800",
    },
    error: {
      main: "#f44336",
    },
    info: {
      main: "#2196f3",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
    },
    h2: {
      fontWeight: 600,
      fontSize: "2rem",
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.75rem",
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
    },
    h6: {
      fontWeight: 600,
      fontSize: "1rem",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#212121",
          backgroundImage: "linear-gradient(45deg, #212121 30%, #424242 90%)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
        },
        containedPrimary: {
          backgroundImage: "linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)",
          "&:hover": {
            backgroundImage: "linear-gradient(45deg, #7b1fa2 30%, #9c27b0 90%)",
          },
        },
        outlinedPrimary: {
          borderColor: "#9c27b0",
          color: "#9c27b0",
          "&:hover": {
            backgroundColor: "rgba(156, 39, 176, 0.08)",
            borderColor: "#ba68c8",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e1e1e",
          border: "1px solid #333",
          borderRadius: 12,
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#212121",
          borderRight: "1px solid #333",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: "#212121",
          color: "#ffffff",
          fontWeight: 600,
        },
        body: {
          borderBottom: "1px solid #333",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "1px solid #333",
          borderRadius: 8,
        },
        columnHeaders: {
          backgroundColor: "#212121",
        },
        cell: {
          borderBottom: "1px solid #333",
        },
        row: {
          "&:hover": {
            backgroundColor: "rgba(156, 39, 176, 0.08)",
          },
        },
      },
    },
  },
});

export default theme;
