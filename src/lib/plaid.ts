// Sets up the client used to talk to Plaid's API. Every route that needs to
// call Plaid imports `plaidClient` from here instead of configuring its own.
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

let cachedClient: PlaidApi | undefined;

// Builds (or reuses) the actual Plaid client. Deliberately NOT run
// automatically when this file is first imported -- see the Proxy below for
// why that matters.
function getPlaidClient(): PlaidApi {
  if (cachedClient) return cachedClient;

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    throw new Error(
      "PLAID_CLIENT_ID / PLAID_SECRET are not set (check .env.local)"
    );
  }

  const env = process.env.PLAID_ENV ?? "sandbox";
  // PlaidEnvironments translates our env name ("sandbox" | "development" |
  // "production") into the actual web address for Plaid's API in that
  // environment. "sandbox" is a fake test version of Plaid with made-up
  // banks and made-up data, safe to experiment with. "production" talks to
  // real banks and only works once Plaid has approved this app for that.
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  });

  cachedClient = new PlaidApi(configuration);
  return cachedClient;
}

// The shared Plaid API client used everywhere else in the app. This looks
// like a plain object, but it's actually a "Proxy" -- a wrapper that
// intercepts property access (like `.linkTokenCreate`) and only THEN calls
// getPlaidClient() above to actually build the real client.
//
// Why this matters: on Vercel, secrets like PLAID_SECRET are only handed to
// the app while it's actually handling a real request, not while the app is
// being built beforehand. If this ran as soon as the file was imported (as
// it used to), the build itself would fail with "not set" even though the
// secret is configured correctly, because building isn't a real request
// yet. Delaying the actual check until something on `plaidClient` is used
// for real (which only happens once a request comes in) avoids that.
export const plaidClient: PlaidApi = new Proxy({} as PlaidApi, {
  get(_target, prop) {
    return getPlaidClient()[prop as keyof PlaidApi];
  },
});
