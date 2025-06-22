import * as path from "path";
import type { Config } from "../config.js";
import { sanitizeFilename } from "../config.js";
import { 
  _spawnPromise, 
  validateUrl, 
  getFormattedTimestamp, 
  isYouTubeUrl,
  generateRandomFilename 
} from "./utils.js";
import { downloadManager } from "./downloadManager.js";

/**
 * Downloads a video from the specified URL.
 * 
 * @param url - The URL of the video to download
 * @param config - Configuration object for download settings
 * @param resolution - Preferred video resolution ('480p', '720p', '1080p', 'best')
 * @returns Promise resolving to a success message with the downloaded file path or job ID for async downloads
 * @throws {Error} When URL is invalid or download fails
 * 
 * @example
 * ```typescript
 * // Download with default settings (sync)
 * const result = await downloadVideo('https://youtube.com/watch?v=...');
 * console.log(result);
 * 
 * // Download with specific resolution (async if enabled)
 * const hdResult = await downloadVideo(
 *   'https://youtube.com/watch?v=...',
 *   undefined,
 *   '1080p'
 * );
 * console.log(hdResult);
 * ```
 */
export async function downloadVideo(
  url: string,
  config: Config,
  resolution: "480p" | "720p" | "1080p" | "best" = "720p"
): Promise<string> {
  const userDownloadsDir = config.file.downloadsDir;
  
  try {
    validateUrl(url);
    const timestamp = getFormattedTimestamp();
      
    let format: string;
    if (isYouTubeUrl(url)) {
      // YouTube-specific format selection
      switch (resolution) {
        case "480p":
          format = "bestvideo[height<=480]+bestaudio/best[height<=480]/best";
          break;
        case "720p":
          format = "bestvideo[height<=720]+bestaudio/best[height<=720]/best";
          break;
        case "1080p":
          format = "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best";
          break;
        case "best":
          format = "bestvideo+bestaudio/best";
          break;
        default:
          format = "bestvideo[height<=720]+bestaudio/best[height<=720]/best";
      }
    } else {
      // For other platforms, use quality labels that are more generic
      switch (resolution) {
        case "480p":
          format = "worst[height>=480]/best[height<=480]/worst";
          break;
        case "best":
          format = "bestvideo+bestaudio/best";
          break;
        default: // Including 720p and 1080p cases
          // Prefer HD quality but fallback to best available
          format = "bestvideo[height>=720]+bestaudio/best[height>=720]/best";
      }
    }

    let outputTemplate: string;
    let expectedFilename: string;
    
    try {
      // 嘗試獲取檔案名稱
      outputTemplate = path.join(
        userDownloadsDir,
        sanitizeFilename(`%(title)s [%(id)s] ${timestamp}`, config.file) + '.%(ext)s'
      );
      
      expectedFilename = await _spawnPromise("yt-dlp", [
        "--get-filename",
        "-f", format,
        "--output", outputTemplate,
        url
      ]);
      expectedFilename = expectedFilename.trim();
    } catch (error) {
      // 如果無法獲取檔案名稱，使用隨機檔案名
      const randomFilename = generateRandomFilename('mp4');
      outputTemplate = path.join(userDownloadsDir, randomFilename);
      expectedFilename = randomFilename;
    }
    
    // Check if async download is enabled
    if (config.download.asyncDownload) {
      // Start background download
      const jobId = downloadManager.generateJobId();
      const args = [
        "--progress",
        "--newline",
        "--no-mtime",
        "-f", format,
        "--output", outputTemplate,
        url
      ];
      
      downloadManager.startDownload(jobId, url, 'video', 'yt-dlp', args, expectedFilename);
      
      return `Video download started in background. Job ID: ${jobId}. Use the job ID to check download status.`;
    } else {
      // Download with progress info (synchronous)
      try {
        await _spawnPromise("yt-dlp", [
          "--progress",
          "--newline",
          "--no-mtime",
          "-f", format,
          "--output", outputTemplate,
          url
        ]);
      } catch (error) {
        throw new Error(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      return `Video successfully downloaded as "${path.basename(expectedFilename)}" to ${userDownloadsDir}`;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Downloads a video and speeds it up using ffmpeg.
 * 
 * @param url - The URL of the video to download
 * @param config - Configuration object for download settings
 * @param resolution - Preferred video resolution ('480p', '720p', '1080p', 'best')
 * @param speedMultiplier - Speed multiplier (e.g., 2 for 2x speed)
 * @returns Promise resolving to a success message
 * @throws {Error} When URL is invalid or download fails
 */
export async function downloadSpeedyVideo(
  url: string,
  config: Config,
  resolution: "480p" | "720p" | "1080p" | "best" = "720p",
  speedMultiplier: number = 2
): Promise<string> {
  const userDownloadsDir = config.file.downloadsDir;
  
  try {
    validateUrl(url);
    
    if (speedMultiplier <= 0 || speedMultiplier > 10) {
      throw new Error("Speed multiplier must be between 0.1 and 10");
    }
    
    const timestamp = getFormattedTimestamp();
    const baseFilename = generateRandomFilename();
      
    let videoFormat: string;
    let audioFormat: string = "bestaudio";
    
    if (isYouTubeUrl(url)) {
      // YouTube-specific format selection for video only
      switch (resolution) {
        case "480p":
          videoFormat = "best[height<=480]";
          break;
        case "720p":
          videoFormat = "best[height<=720]/best[height<=480]";
          break;
        case "1080p":
          videoFormat = "best[height<=1080]/best[height<=720]/best[height<=480]";
          break;
        case "best":
          videoFormat = "bestvideo";
          break;
        default:
          videoFormat = "best[height<=720]/best[height<=480]";
      }
    } else {
      // For non-YouTube URLs, try to get best available
      videoFormat = "bestvideo";
    }

    // Download video and audio separately, then merge and speed up
    const videoFile = path.join(userDownloadsDir, `${baseFilename}_${timestamp}_video.%(ext)s`);
    const audioFile = path.join(userDownloadsDir, `${baseFilename}_${timestamp}_audio.%(ext)s`);
    const mergedFile = path.join(userDownloadsDir, `${baseFilename}_${timestamp}_merged.mp4`);
    const speedyFile = path.join(userDownloadsDir, `${baseFilename}_${timestamp}_speedy_${speedMultiplier}x.mp4`);
    
    try {
      // Download video stream
      await _spawnPromise("yt-dlp", [
        "--format", videoFormat,
        "--output", videoFile,
        url
      ]);

      // Download audio stream
      await _spawnPromise("yt-dlp", [
        "--format", audioFormat,
        "--output", audioFile,
        url
      ]);

      // Find the actual downloaded files
      const fs = await import('fs');
      const files = fs.readdirSync(userDownloadsDir);
      
      const videoFiles = files.filter(f => f.includes(baseFilename) && f.includes('video'));
      const audioFiles = files.filter(f => f.includes(baseFilename) && f.includes('audio'));
      
      if (videoFiles.length === 0) {
        throw new Error("Video file not found after download");
      }
      if (audioFiles.length === 0) {
        throw new Error("Audio file not found after download");
      }
      
      const actualVideoFile = path.join(userDownloadsDir, videoFiles[0]);
      const actualAudioFile = path.join(userDownloadsDir, audioFiles[0]);
      
      // Merge video and audio with ffmpeg
      await _spawnPromise('ffmpeg', [
        '-i', actualVideoFile,
        '-i', actualAudioFile,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-y', // Overwrite output file
        mergedFile
      ]);
      
      // Speed up the merged video
      await _spawnPromise('ffmpeg', [
        '-i', mergedFile,
        '-filter:v', `setpts=${1/speedMultiplier}*PTS`,
        '-filter:a', `atempo=${speedMultiplier}`,
        '-y', // Overwrite output file
        speedyFile
      ]);

      // Clean up intermediate files
      fs.unlinkSync(actualVideoFile);
      fs.unlinkSync(actualAudioFile);
      fs.unlinkSync(mergedFile);

      return `Speedy video successfully created as "${path.basename(speedyFile)}" (${speedMultiplier}x speed) in ${userDownloadsDir}`;
    } catch (error) {
      throw new Error(`Speedy download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    throw error;
  }
}