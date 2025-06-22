# yt-dlp-mcp

An MCP server implementation that integrates with yt-dlp, providing video and audio content download capabilities (e.g. YouTube, Facebook, Tiktok, etc.) for LLMs.

## Features

* **YouTube Search**: Search YouTube videos and get detailed results
* **Quick Download**: Search and immediately download the top video result
* **Subtitles**: Download subtitles in SRT format for LLMs to read
* **Video Download**: Save videos to your Downloads folder with resolution control
* **Audio Download**: Save audios to your Downloads folder
* **Privacy-Focused**: Direct download without tracking
* **MCP Integration**: Works with Windsurf and other MCP-compatible LLMs

## Installation

### Prerequisites

Install `yt-dlp` based on your operating system:

```bash
# Windows
winget install yt-dlp

# macOS
brew install yt-dlp

# Linux
pip install yt-dlp
```


### YouTube Search Configuration (Optional)

To use the YouTube search features (`search_youtube` and `search_and_download_top`), you need a YouTube Data API key:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API key)
5. Add the API key to your MCP configuration:

```json
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": [
        "-y",
        "github:sanchorelaxo/yt-search"
      ],
      "env": {
        "YOUTUBE_API_KEY": "your-api-key-here",
        "ASYNC_DLS_ENABLED": "true"
      }
    }
  }
}
```

**Note**: Without the API key, only the direct download tools (using video URLs) will work. The search tools require the API key. Set `ASYNC_DLS_ENABLED` to `"false"` for synchronous downloads.

## Tool Documentation

* **search_youtube**
  * Search YouTube videos and return the top 12 results with video details
  * Inputs:
    * `query` (string, required): Search query string
    * `maxResults` (number, optional): Maximum number of results to return (1-50, default: 12)

* **search_and_download_top**
  * Search YouTube and immediately download the video (with audio) of the top result
  * Inputs:
    * `query` (string, required): Search query string
    * `resolution` (string, optional): Video resolution ('480p', '720p', '1080p', 'best'). Defaults to '720p'

* **list_subtitle_languages**
  * List all available subtitle languages and their formats for a video (including auto-generated captions)
  * Inputs:
    * `url` (string, required): URL of the video

* **download_video_subtitles**
  * Download video subtitles in any available format. Supports both regular and auto-generated subtitles
  * Inputs:
    * `url` (string, required): URL of the video
    * `language` (string, optional): Language code (e.g., 'en', 'zh-Hant', 'ja'). Defaults to 'en'

* **download_video**
  * Download video to user's Downloads folder
  * Inputs:
    * `url` (string, required): URL of the video
    * `resolution` (string, optional): Video resolution ('480p', '720p', '1080p', 'best'). Defaults to '720p'

* **download_audio**
  * Download audio in best available quality (usually m4a/mp3 format) to user's Downloads folder
  * Inputs:
    * `url` (string, required): URL of the video

* **download_transcript**
  * Download and clean video subtitles to produce a plain text transcript without timestamps or formatting
  * Inputs:
    * `url` (string, required): URL of the video
    * `language` (string, optional): Language code (e.g., 'en', 'zh-Hant', 'ja'). Defaults to 'en'

## Usage Examples

Ask your LLM to:
```markdown
"Check the status of all my downloads"
"List available subtitles for this video: https://youtube.com/watch?v=..."
"Download a video from facebook: https://facebook.com/..."
"Download Chinese subtitles from this video: https://youtube.com/watch?v=..."
"Download this video in 1080p: https://youtube.com/watch?v=..."
"Download audio from this YouTube video: https://youtube.com/watch?v=..."
"Get a clean transcript of this video: https://youtube.com/watch?v=..."
"Download Spanish transcript from this video: https://youtube.com/watch?v=..."
"Search YouTube for videos about AI: AI"
"Search YouTube for videos about AI and download the top result in 1080p: AI, 1080p"
```

## Manual Start

If needed, start the server manually:
```bash
npx github:sanchorelaxo/yt-search
```

## Requirements

* Node.js 20+
* `yt-dlp` in system PATH
* MCP-compatible LLM service


## Documentation

- [Getting Google API Key](./docs/google-api-setup.md)
- [API Reference](./docs/api.md)
- [Configuration](./docs/configuration.md)
- [Error Handling](./docs/error-handling.md)
- [Contributing](./docs/contributing.md)


## License

MIT

## Author

Dewei Yen
(forked by Roger Sanche)