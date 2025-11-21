import { Iconify } from '@/components/iconify';

import type { AccountDrawerProps } from './components/account-drawer';

// ----------------------------------------------------------------------

export const _account: AccountDrawerProps['data'] = [
  { label: 'Home', href: '/', icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
  {
    label: 'Profile',
    href: '#',
    icon: <Iconify icon="custom:profile-duotone" />,
  },
  { label: 'Account settings', href: '#', icon: <Iconify icon="solar:settings-bold-duotone" /> },
];
