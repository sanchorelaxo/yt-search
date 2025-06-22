import { google } from 'googleapis';
import { downloadVideo } from './video.js';
import type { Config } from '../config.js';

/**
 * YouTube search result interface
 */
export interface YouTubeSearchResult {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
  duration?: string;
  viewCount?: string;
}

/**
 * Search YouTube videos using the YouTube Data API
 * 
 * @param query - Search query string
 * @param maxResults - Maximum number of results to return (default: 12)
 * @param apiKey - YouTube Data API key
 * @returns Promise resolving to formatted JSON string of search results
 * 
 * @example
 * ```typescript
 * const results = await searchYouTube('javascript tutorial', 12, 'your-api-key');
 * console.log(results);
 * ```
 */
export async function searchYouTube(
  query: string,
  maxResults: number = 12,
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('YouTube API key is required. Please set the YOUTUBE_API_KEY environment variable.');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Search query cannot be empty');
  }

  if (maxResults < 1 || maxResults > 50) {
    throw new Error('maxResults must be between 1 and 50');
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    // Search for videos
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      maxResults: maxResults,
      order: 'relevance',
      safeSearch: 'moderate',
      videoEmbeddable: 'true'
    });

    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return '[]';
    }

    // Get video IDs for additional details
    const videoIds = searchResponse.data.items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean) as string[];

    // Get additional video details (duration, view count, etc.)
    const videosResponse = await youtube.videos.list({
      part: ['contentDetails', 'statistics'],
      id: videoIds
    });

    const videoDetails = new Map();
    if (videosResponse.data.items) {
      for (const video of videosResponse.data.items) {
        if (video.id) {
          videoDetails.set(video.id, {
            duration: video.contentDetails?.duration,
            viewCount: video.statistics?.viewCount
          });
        }
      }
    }

    // Format results
    const results: YouTubeSearchResult[] = searchResponse.data.items.map((item: any) => {
      const videoId = item.id?.videoId || '';
      const snippet = item.snippet;
      const details = videoDetails.get(videoId);
      
      return {
        id: videoId,
        title: snippet?.title || 'Unknown Title',
        description: snippet?.description || '',
        channelTitle: snippet?.channelTitle || 'Unknown Channel',
        publishedAt: snippet?.publishedAt || '',
        thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        duration: details?.duration ? formatDuration(details.duration) : undefined,
        viewCount: details?.viewCount ? formatViewCount(details.viewCount) : undefined
      };
    });

    return JSON.stringify(results, null, 2);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`YouTube search failed: ${error.message}`);
    }
    throw new Error('YouTube search failed with unknown error');
  }
}

/**
 * Search YouTube and immediately download the top result
 * 
 * @param query - Search query string
 * @param config - Application configuration
 * @param resolution - Video resolution preference
 * @param apiKey - YouTube Data API key
 * @returns Promise resolving to download result message
 * 
 * @example
 * ```typescript
 * const result = await searchAndDownloadTop('javascript tutorial', config, '720p', 'your-api-key');
 * console.log(result);
 * ```
 */
export async function searchAndDownloadTop(
  query: string,
  config: Config,
  resolution: '480p' | '720p' | '1080p' | 'best' = '720p',
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('YouTube API key is required. Please set the YOUTUBE_API_KEY environment variable.');
  }

  // Search for videos
  const searchResults = await searchYouTube(query, 1, apiKey);
  
  if (searchResults === '[]') {
    throw new Error(`No videos found for query: "${query}"`);
  }

  const topResult = JSON.parse(searchResults)[0];
  
  try {
    // Download the top result
    const downloadResult = await downloadVideo(topResult.url, config, resolution);
    
    return `Successfully downloaded top search result:
Title: ${topResult.title}
Channel: ${topResult.channelTitle}
URL: ${topResult.url}
${downloadResult}`;
  } catch (error) {
    throw new Error(`Failed to download top result for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format ISO 8601 duration to human readable format
 * 
 * @param duration - ISO 8601 duration string (e.g., "PT4M13S")
 * @returns Formatted duration string (e.g., "4:13")
 */
function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Format view count to human readable format
 * 
 * @param viewCount - View count as string
 * @returns Formatted view count (e.g., "1.2M views")
 */
function formatViewCount(viewCount: string): string {
  const count = parseInt(viewCount);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  } else {
    return `${count} views`;
  }
}
