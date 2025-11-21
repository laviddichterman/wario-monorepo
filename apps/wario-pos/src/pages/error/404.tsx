import { NotFoundView } from '@/sections/error';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `404 page not found! | Error - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>

      <NotFoundView />
    </>
  );
}
