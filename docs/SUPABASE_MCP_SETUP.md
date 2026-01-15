# Supabase MCP Server Setup

## Overview

The Supabase MCP (Model Context Protocol) server has been configured to enable AI assistants to interact with your Supabase project directly from Cursor IDE.

## Current Configuration

The MCP server is configured to use the **remote hosted server** at `https://mcp.supabase.com/mcp`. This configuration is stored in `~/.cursor/mcp.json`.

### Configuration File Location
```
~/.cursor/mcp.json
```

### Current Setup
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

## Next Steps

### 1. Restart Cursor IDE
After configuring the MCP server, **restart Cursor IDE** to load the new configuration.

### 2. Authenticate with Supabase
When you first use the MCP server, Cursor will prompt you to authenticate with Supabase:
- You'll be redirected to Supabase's OAuth login
- Select the organization containing your project
- Grant necessary permissions

### 3. Verify Connection
After restarting and authenticating, you should be able to:
- Query your Supabase database schema
- Execute SQL queries
- Manage tables and data
- Access Supabase resources through the MCP interface

## Alternative: Local MCP Server

If you prefer to use the local package instead of the remote server, you can update `~/.cursor/mcp.json` with:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "your_supabase_url",
        "SUPABASE_ANON_KEY": "your_anon_key",
        "SUPABASE_SERVICE_ROLE_KEY": "your_service_role_key"
      }
    }
  }
}
```

**Note:** Replace the environment variable values with your actual Supabase credentials from `.env.local`.

### Local Server Limitations
- Provides a limited subset of tools compared to the remote server
- Lacks OAuth 2.1 support
- Requires manual credential configuration

## Troubleshooting

### MCP Resources Not Showing
1. **Restart Cursor IDE** - The configuration is only loaded on startup
2. **Check Configuration** - Verify `~/.cursor/mcp.json` has the correct format
3. **Check Authentication** - Ensure you've completed the OAuth flow
4. **Check Network** - The remote server requires internet connectivity

### Authentication Issues
- Make sure you're logged into the correct Supabase organization
- Verify your Supabase project is accessible
- Check that OAuth 2.1 is enabled in your Supabase project settings

### Local Server Issues
- Ensure `@supabase/mcp-server-supabase` is installed: `npm list @supabase/mcp-server-supabase`
- Verify environment variables are correctly set
- Check that your Supabase credentials are valid

## Security Notes

⚠️ **Important Security Considerations:**
- **Do NOT connect MCP to production databases** - The MCP server is designed for development tasks
- Use the MCP server only with development/staging environments
- Review Supabase security best practices before connecting AI tools

## Package Information

- **Package**: `@supabase/mcp-server-supabase@^0.5.10`
- **Location**: Installed as dev dependency in `package.json`
- **Documentation**: [Supabase MCP Server](https://github.com/supabase-community/supabase-mcp)

## Resources

- [Supabase MCP Server Documentation](https://supabase.com/features/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase OAuth 2.1 Guide](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
