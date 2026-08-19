import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const env = process.env.PLAID_ENV ?? "sandbox";

if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
  throw new Error(
    "PLAID_CLIENT_ID / PLAID_SECRET are not set (check .env.local)"
  );
}

// PlaidEnvironments maps our env name ("sandbox" | "development" | "production")
// to the actual base URL for Plaid's API in that environment. Sandbox uses fake
// test institutions/data; production talks to real banks and requires Plaid's
// approval before it'll return real data.
const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
