import { useCatalogQuery } from '@wcp/wario-ux-shared/query';

import { Label } from '@/components/label';

export function VersionInfo(labelProps: React.ComponentProps<typeof Label>) {
  const { data: catalog } = useCatalogQuery();
  const backendVersion = catalog
    ? `${catalog.api.major.toString()}.${catalog.api.minor.toString()}.${catalog.api.patch.toString()}`
    : null;
  return (
    <Label {...labelProps}>
      v{__APP_VERSION__}
      {backendVersion ? ` / ${backendVersion}` : ''}
    </Label>
  );
}
