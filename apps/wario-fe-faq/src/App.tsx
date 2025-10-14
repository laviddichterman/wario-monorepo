
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ScopedCssBaseline } from '@mui/material';

import { themeOptions } from '@wcp/wario-ux-shared';
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