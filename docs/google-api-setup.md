# Getting Google API Key for YouTube Data API v3

This guide will walk you through the process of obtaining a YouTube Data API v3 key, which is required for the search functionality in the yt-search MCP server.

## Prerequisites

- A Google account
- Access to the Google Cloud Console

## Step-by-Step Instructions

### 1. Access Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### 2. Create or Select a Project

1. If you don't have a project, click **"Create Project"**
   - Enter a project name (e.g., "yt-search-mcp")
   - Click **"Create"**
2. If you have existing projects, select the one you want to use from the dropdown

### 3. Enable YouTube Data API v3

1. In the left sidebar, navigate to **"APIs & Services"** > **"Library"**
2. Search for **"YouTube Data API v3"**
3. Click on **"YouTube Data API v3"** from the results
4. Click **"Enable"** button

### 4. Create API Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"** from the dropdown
4. Your API key will be generated and displayed

### 5. Secure Your API Key (Recommended)

1. Click **"RESTRICT KEY"** or the pencil icon next to your key
2. Under **"Application restrictions"**, you can choose:
   - **HTTP referrers**: If using from a web application
   - **IP addresses**: If using from specific servers
   - **None**: For testing (not recommended for production)
3. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Choose **"YouTube Data API v3"** from the list
4. Click **"Save"**

### 6. Configure the MCP Server

Add your API key to the MCP server configuration:

```json
{
  "mcpServers": {
    "yt-search": {
      "command": "npx",
      "args": [
        "-y",
        "github:sanchorelaxo/yt-search"
      ],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

## Usage Quotas

The YouTube Data API v3 has the following default quotas:

- **Daily quota**: 10,000 units per day
- **Search operations**: 100 units per request
- **Video details**: 1 unit per video

This means you can perform approximately 100 searches per day with the default quota.

## Quota Management

To monitor your API usage:

1. Go to **"APIs & Services"** > **"Quotas"**
2. Search for **"YouTube Data API v3"**
3. View your current usage and remaining quota

## Troubleshooting

### Common Issues

**"API key not valid" error:**
- Verify the API key is correctly copied
- Check that YouTube Data API v3 is enabled
- Ensure API restrictions allow your usage

**"Quota exceeded" error:**
- Check your daily quota usage in the console
- Wait for quota reset (daily at midnight Pacific Time)
- Request quota increase if needed

**"Access forbidden" error:**
- Verify API key restrictions
- Check that the key has access to YouTube Data API v3

### Getting Help

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Google Cloud Console Support](https://cloud.google.com/support)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables** for API keys
3. **Restrict API keys** to specific APIs and referrers/IPs
4. **Rotate keys regularly** for production applications
5. **Monitor usage** to detect unauthorized access

## Cost Considerations

The YouTube Data API v3 is free up to the daily quota limit. If you need higher quotas:

1. Go to **"APIs & Services"** > **"Quotas"**
2. Find YouTube Data API v3 quotas
3. Click **"Edit Quotas"** to request an increase
4. Fill out the quota increase form with justification

Note: Quota increases may take several days to be approved and may incur costs for very high usage.
