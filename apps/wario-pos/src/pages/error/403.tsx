import { View403 } from '@/sections/error';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `403 forbidden! | Error - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <View403 />
    </>
  );
}
