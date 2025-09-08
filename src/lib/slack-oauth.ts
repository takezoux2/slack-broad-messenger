// src/lib/slack-oauth.ts
// Example of how to use Slack Client Secret securely

export interface SlackOAuthTokenResponse {
  access_token: string;
  team: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export async function exchangeCodeForToken(
  code: string,
): Promise<SlackOAuthTokenResponse> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Slack OAuth credentials not configured");
  }

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret, // サーバーサイドでのみ使用
      code,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error}`);
  }

  return data;
}
