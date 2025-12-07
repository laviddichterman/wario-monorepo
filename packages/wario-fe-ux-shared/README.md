# @wcp/wario-fe-ux-shared

A collection of shared UX elements for the customer-facing single-page applications in the WARIO suite. This package provides reusable components, utilities, and styles to ensure a consistent user experience across the WARIO ecosystem.

## Features

- Reusable UI components
- Shared styles and themes
- Utility functions for UX consistency

## Installation

```bash
npm install @wcp/wario-fe-ux-shared
```

## Usage

Import the components, styles, or utilities you need into your application:

```javascript
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ScopedCssBaseline } from '@mui/material';

import { themeOptions } from '@wcp/wario-fe-ux-shared';
const theme = createTheme(themeOptions);
function App() {

  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        {<... />}
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}
```

## Contributing

Contributions are welcome! Maybe you can start by helping define the contribution policy?

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
