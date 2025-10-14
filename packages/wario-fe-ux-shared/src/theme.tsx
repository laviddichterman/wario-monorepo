import type { ThemeOptions } from '@mui/material';

export const themeOptions: ThemeOptions = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 500,
      md: 750,
      lg: 935,
      xl: 1250,
    },
  },
  zIndex: {
    snackbar: 2500
  },
  typography: {
    allVariants: {
      fontFamily: 'Cabin',
    },
    fontFamily: '"Cabin", "Source Sans Pro"',
    fontSize: 13,
    h1: {
      fontFamily: 'Source Sans Pro',
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: 'Source Sans Pro',
      textTransform: 'uppercase',
    },
    h3: {
      fontFamily: 'Source Sans Pro',
      textTransform: 'uppercase',
    },
    h4: {
      fontFamily: 'Source Sans Pro',
      textTransform: 'uppercase',
    },
    h5: {
      fontFamily: 'Source Sans Pro',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
  },
  components: {
    MuiTabs: {
      styleOverrides: {
        flexContainer: {
          flexWrap: 'wrap'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          border: "1px dotted rgba(255,0,0,0.0)",
          '&.Mui-selected': {
            backgroundColor: "#c59d5f",
            color: 'black',
            borderBottom: "1px solid #000000",
          }
        },
      }
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          border: "1px solid #000000",
          backgroundColor: '#fcfcfc',
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '& input': {
            padding: '16.5px 14px',
            border: 0,
            outlineWidth: 0,
            '&:focus': {
              outlineWidth: 0,
            }
          }
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        content: {
          margin: "0px",
        },
        root: {
          paddingLeft: 0,
          borderBottom: '1px solid',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "black",
          "&.Mui-disabled": {
            pointerEvents: "unset",
            cursor: "not-allowed",
            backgroundColor: "#D3D3D3",
            color: 'black'
          },
          "&.Mui-selected": {
            backgroundColor: "#c59d5f"
          },
          "&:hover": {
            backgroundColor: "#c59d5f"
          },
        },
      }
    },
    MuiGrid: {
      styleOverrides: {

      }
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          backgroundColor: "black",
          "&.Mui-disabled": {
            pointerEvents: "unset",
            cursor: "not-allowed",
            backgroundColor: "#D3D3D3",
            color: 'black'
          },
          "&.Mui-selected": {
            color: 'white',
            backgroundColor: "#c59d5f",
            "&:hover": {
              color: 'white',
              backgroundColor: "#c59d5f"
            },
          },
          "&:hover": {
            color: 'white',
            backgroundColor: "#c59d5f"
          },
        },
      }
    }
  }
};
