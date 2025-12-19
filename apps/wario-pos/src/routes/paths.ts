// ----------------------------------------------------------------------
const ROOTS = {
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  // about: '/about-us',
  // contact: '/contact-us',
  // faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  // components: '/components',
  // product: {
  //   root: `/product`,
  //   checkout: `/product/checkout`,
  //   details: (id: string) => `/product/${id}`,
  //   demo: { details: `/product/${MOCK_ID}` },
  // },
  // post: {
  //   root: `/post`,
  //   details: (title: string) => `/post/${kebabCase(title)}`,
  //   demo: { details: `/post/${kebabCase(MOCK_TITLE)}` },
  // },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    // mail: `${ROOTS.DASHBOARD}/mail`,
    // chat: `${ROOTS.DASHBOARD}/chat`,
    // blank: `${ROOTS.DASHBOARD}/blank`,
    // kanban: `${ROOTS.DASHBOARD}/kanban`,
    // calendar: `${ROOTS.DASHBOARD}/calendar`,
    // fileManager: `${ROOTS.DASHBOARD}/file-manager`,
    // permission: `${ROOTS.DASHBOARD}/permission`,
    general: {
      // orders: `${ROOTS.DASHBOARD}/orders`,
      timing: `${ROOTS.DASHBOARD}/timing`,
      credit: `${ROOTS.DASHBOARD}/credit`,
      catalog: `${ROOTS.DASHBOARD}/catalog`,
      settings: `${ROOTS.DASHBOARD}/settings`,
    },
    user: {
      root: `${ROOTS.DASHBOARD}/user`,
      // new: `${ROOTS.DASHBOARD}/user/new`,
      profile: `${ROOTS.DASHBOARD}/user/profile`,
      // account: `${ROOTS.DASHBOARD}/user/account`,
      // edit: (id: string) => `${ROOTS.DASHBOARD}/user/${id}/edit`,
      // demo: { edit: `${ROOTS.DASHBOARD}/user/${MOCK_ID}/edit` },
    },
    // product: {
    //   root: `${ROOTS.DASHBOARD}/product`,
    //   new: `${ROOTS.DASHBOARD}/product/new`,
    //   details: (id: string) => `${ROOTS.DASHBOARD}/product/${id}`,
    //   edit: (id: string) => `${ROOTS.DASHBOARD}/product/${id}/edit`,
    //   demo: {
    //     details: `${ROOTS.DASHBOARD}/product/${MOCK_ID}`,
    //     edit: `${ROOTS.DASHBOARD}/product/${MOCK_ID}/edit`,
    //   },
    // },
    // post: {
    //   root: `${ROOTS.DASHBOARD}/post`,
    //   new: `${ROOTS.DASHBOARD}/post/new`,
    //   details: (title: string) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}`,
    //   edit: (title: string) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}/edit`,
    //   demo: {
    //     details: `${ROOTS.DASHBOARD}/post/${kebabCase(MOCK_TITLE)}`,
    //     edit: `${ROOTS.DASHBOARD}/post/${kebabCase(MOCK_TITLE)}/edit`,
    //   },
    // },
    order: {
      root: `${ROOTS.DASHBOARD}/order`,
      // details: (id: string) => `${ROOTS.DASHBOARD}/order/${id}`,
      // demo: { details: `${ROOTS.DASHBOARD}/order/${MOCK_ID}` },
    },
    catalog: {
      root: `${ROOTS.DASHBOARD}/catalog/`,
      products: {
        root: `${ROOTS.DASHBOARD}/catalog/products`,
        details: (id: string) => `${ROOTS.DASHBOARD}/catalog/products/${id}`,
      },
      modifiers: `${ROOTS.DASHBOARD}/catalog/modifiers`,
      productfunctions: `${ROOTS.DASHBOARD}/catalog/product-functions`,
      printergroups: `${ROOTS.DASHBOARD}/catalog/printer-groups`,
    },
    seating: {
      builder: `${ROOTS.DASHBOARD}/seating-builder`,
    },
  },
};
