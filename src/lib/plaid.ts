// Sets up the client used to talk to Plaid's API. Every route that needs to
// call Plaid imports `plaidClient` from here instead of configuring its own.
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const env = process.env.PLAID_ENV ?? "sandbox";

if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
  throw new Error(
    "PLAID_CLIENT_ID / PLAID_SECRET are not set (check .env.local)"
  );
}

// PlaidEnvironments translates our env name ("sandbox" | "development" |
// "production") into the actual web address for Plaid's API in that
// environment. "sandbox" is a fake test version of Plaid with made-up banks
// and made-up data, safe to experiment with. "production" talks to real
// banks and only works once Plaid has approved this app for that.
const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

// The shared Plaid API client used everywhere else in the app.
export const plaidClient = new PlaidApi(configuration);
