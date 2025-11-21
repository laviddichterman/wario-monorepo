import { useAppSelector } from '@/hooks/useRedux';

import { Label } from '@/components/label';

export function VersionInfo(labelProps: React.ComponentProps<typeof Label>) {
  const backendVersion = useAppSelector((s) => s.ws.catalog ? `${s.ws.catalog.api.major.toString()}.${s.ws.catalog.api.minor.toString()}.${s.ws.catalog.api.patch.toString()}` : null);
  return (
    <Label {...labelProps}>v{__APP_VERSION__}{backendVersion ? ` / ${backendVersion}` : ""}</Label>
  );
}
