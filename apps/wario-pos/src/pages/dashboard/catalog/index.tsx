import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = {
  title: `Item match params | Dashboard - ${CONFIG.appName}`,
};

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
    </>
  );
}
