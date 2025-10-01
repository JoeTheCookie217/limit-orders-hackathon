import React from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink } from '@trpc/client';
import { ToastContainer } from 'react-toastify';
import Layout from 'components/Layout';
import LimitOrdersPage from 'components/LimitOrdersPage';
import AccountProvider from 'providers/AccountProvider';
import SettingsProvider from 'providers/SettingsProvider';
import { api } from 'utils/config';
import { trpc } from "utils/trpc";

import "assets/scss/index.scss";
import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      console.error(error);
      if (error.message.includes("data is undefined")) return;
      // toast.error(`Something went wrong: ${error.message}`);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: api,
    }),
  ],
});

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AccountProvider>
            <Layout>
              <LimitOrdersPage />
            </Layout>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </AccountProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
