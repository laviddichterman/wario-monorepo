import { paths } from '@/routes/paths';

import type { NavSectionProps } from '@/components/nav-section';
import { SvgColor } from '@/components/svg-color';

import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  params: icon('ic-params'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  subpaths: icon('ic-subpaths'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
};

// ----------------------------------------------------------------------

export const navData: NavSectionProps['data'] = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'App', path: paths.dashboard.root, icon: ICONS.dashboard },
      { title: 'Orders', path: paths.dashboard.order.root, icon: ICONS.order },
      {
        title: 'Catalog',
        path: paths.dashboard.catalog.root,
        icon: ICONS.folder,
        children: [
          { title: 'Products/Categories', path: paths.dashboard.catalog.products.root, icon: ICONS.product },
          { title: 'Modifiers', path: paths.dashboard.catalog.modifiers, icon: ICONS.label },
          { title: 'Printer Groups', path: paths.dashboard.catalog.printergroups, icon: ICONS.folder },
          { title: 'Product Instance Functions', path: paths.dashboard.catalog.productfunctions, icon: ICONS.params },
        ],
      },
      // { title: 'Settings', path: paths.dashboard.settings, icon: ICONS.dashboard },
    ],
  },
  // /**
  //  * Management
  //  */
  // {
  //   subheader: 'Management',
  //   items: [
  //     {
  //       title: 'Group',
  //       path: paths.dashboard.group.root,
  //       icon: ICONS.user,
  //       children: [
  //         { title: 'Four', path: paths.dashboard.group.root },
  //         { title: 'Five', path: paths.dashboard.group.five },
  //         { title: 'Six', path: paths.dashboard.group.six },
  //       ],
  //     },
  //   ],
  // },
];
