import { View500 } from '@/sections/error';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `500 Internal server error! | Error - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <View500 />
    </>
  );
}
