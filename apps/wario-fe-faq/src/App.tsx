
import { ScopedCssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { themeOptions } from '@wcp/wario-fe-ux-shared';

import WNestedInfoComponent from './components/WNestedInfoComponent';
const theme = createTheme(themeOptions);
function App() {

  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>
        {<WNestedInfoComponent />}
      </ThemeProvider>
    </ScopedCssBaseline>
  )
}

export default App;