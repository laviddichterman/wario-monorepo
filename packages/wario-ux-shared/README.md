# wario-ux-shared

Shared utilities, components, and styles for the Wario UX ecosystem.

## Features

- Reusable React components
- Shared utility functions
- Common styles and themes

## Installation

Use your package manager of choice to install:

```bash
npm install @wcp/wario-ux-shared
# or
yarn add @wario/wario-ux-shared
```

## Usage

Import and use the shared components, utilities, or styles in your project:

```javascript
import { Button, ThemeProvider } from '@wcp/wario-ux-shared';
import { formatDate } from '@wcp/wario-ux-shared';

const App = () => (
  <ThemeProvider>
    <Button onClick={() => alert(formatDate(new Date()))}>Click Me</Button>
  </ThemeProvider>
);
```

## Contributing

1. Fork the repository.
2. Create a new branch.
3. Make your changes and commit them.
4. Submit a pull request.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
