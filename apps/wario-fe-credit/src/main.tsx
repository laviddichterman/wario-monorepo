import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { WarioQueryProvider } from '@wcp/wario-ux-shared/query';

import { HOST_API, SOCKETIO } from '@/config';

import App from './App';

const root = createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <WarioQueryProvider hostAPI={HOST_API} namespace={SOCKETIO.ns} attachDebugClient={import.meta.env.DEV}>
      <App />
    </WarioQueryProvider>
  </React.StrictMode>
);