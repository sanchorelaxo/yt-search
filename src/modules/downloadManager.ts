import { spawn } from 'child_process';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface DownloadJob {
  id: string;
  url: string;
  type: 'video' | 'audio' | 'search';
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress?: number;
  filename?: string;
  error?: string;
  startTime: Date;
  endTime?: Date;
  outputPath: string;
}

export interface DownloadProgress {
  id: string;
  progress: number;
  status: string;
  filename?: string;
}

/**
 * Background download manager for handling async downloads
 */
export class DownloadManager extends EventEmitter {
  private jobs: Map<string, DownloadJob> = new Map();
  private activeDownloads: Set<string> = new Set();

  /**
   * Start a background download job
   * @param id - Unique job identifier
   * @param url - URL to download
   * @param type - Type of download (video, audio, search)
   * @param command - yt-dlp command
   * @param args - yt-dlp arguments
   * @param outputPath - Expected output path
   * @returns Job ID
   */
  startDownload(
    id: string,
    url: string,
    type: 'video' | 'audio' | 'search',
    command: string,
    args: string[],
    outputPath: string
  ): string {
    const job: DownloadJob = {
      id,
      url,
      type,
      status: 'pending',
      startTime: new Date(),
      outputPath
    };

    this.jobs.set(id, job);
    this.activeDownloads.add(id);

    // Start the download process
    this.executeDownload(job, command, args);

    return id;
  }

  /**
   * Execute the actual download process
   */
  private executeDownload(job: DownloadJob, command: string, args: string[]): void {
    job.status = 'downloading';
    this.jobs.set(job.id, job);

    const process = spawn(command, args);
    let output = '';

    process.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // Parse progress from yt-dlp output
      const progressMatch = chunk.match(/(\d+(?:\.\d+)?)%/);
      if (progressMatch) {
        job.progress = parseFloat(progressMatch[1]);
        this.jobs.set(job.id, job);
        this.emit('progress', {
          id: job.id,
          progress: job.progress,
          status: 'downloading'
        } as DownloadProgress);
      }

      // Extract filename from output
      const filenameMatch = chunk.match(/\[download\] Destination: (.+)/);
      if (filenameMatch) {
        job.filename = path.basename(filenameMatch[1]);
        this.jobs.set(job.id, job);
      }
    });

    process.stderr.on('data', (data) => {
      output += data.toString();
    });

    process.on('close', (code) => {
      job.endTime = new Date();
      this.activeDownloads.delete(job.id);

      if (code === 0) {
        job.status = 'completed';
        job.progress = 100;
        this.emit('completed', job);
      } else {
        job.status = 'failed';
        job.error = `Download failed with exit code: ${code}\n${output}`;
        this.emit('failed', job);
      }

      this.jobs.set(job.id, job);
    });

    process.on('error', (error) => {
      job.endTime = new Date();
      job.status = 'failed';
      job.error = `Process error: ${error.message}`;
      this.activeDownloads.delete(job.id);
      this.jobs.set(job.id, job);
      this.emit('failed', job);
    });
  }

  /**
   * Get job status by ID
   */
  getJob(id: string): DownloadJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): DownloadJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get active downloads
   */
  getActiveDownloads(): DownloadJob[] {
    return Array.from(this.activeDownloads)
      .map(id => this.jobs.get(id))
      .filter(job => job !== undefined) as DownloadJob[];
  }

  /**
   * Clear completed jobs older than specified time
   * @param olderThanHours - Clear jobs older than this many hours (default: 24)
   */
  clearOldJobs(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        if (job.endTime && job.endTime < cutoffTime) {
          this.jobs.delete(id);
        }
      }
    }
  }

  /**
   * Generate a unique job ID
   */
  generateJobId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check and return formatted status of all downloads
   */
  checkDownloads(): Promise<string> {
    return new Promise((resolve) => {
      const allJobs = this.getAllJobs();
      
      if (allJobs.length === 0) {
        resolve("No downloads found.");
        return;
      }

      const activeJobs = allJobs.filter(job => job.status === 'downloading' || job.status === 'pending');
      const completedJobs = allJobs.filter(job => job.status === 'completed');
      const failedJobs = allJobs.filter(job => job.status === 'failed');

      let result = `Download Status Summary:\n\n`;

      if (activeJobs.length > 0) {
        result += `🔄 Active Downloads (${activeJobs.length}):\n`;
        activeJobs.forEach(job => {
          const progress = job.progress ? `${job.progress.toFixed(1)}%` : 'Starting...';
          const duration = new Date().getTime() - job.startTime.getTime();
          const durationStr = `${Math.floor(duration / 1000)}s`;
          result += `  • ${job.id} - ${job.type} - ${progress} (${durationStr})\n`;
          if (job.filename) result += `    File: ${job.filename}\n`;
          result += `    URL: ${job.url}\n\n`;
        });
      }

      if (completedJobs.length > 0) {
        result += `✅ Completed Downloads (${completedJobs.length}):\n`;
        completedJobs.forEach(job => {
          const duration = job.endTime ? job.endTime.getTime() - job.startTime.getTime() : 0;
          const durationStr = `${Math.floor(duration / 1000)}s`;
          result += `  • ${job.id} - ${job.type} - Completed (${durationStr})\n`;
          if (job.filename) result += `    File: ${job.filename}\n`;
          result += `    Path: ${job.outputPath}\n\n`;
        });
      }

      if (failedJobs.length > 0) {
        result += `❌ Failed Downloads (${failedJobs.length}):\n`;
        failedJobs.forEach(job => {
          result += `  • ${job.id} - ${job.type} - Failed\n`;
          result += `    URL: ${job.url}\n`;
          if (job.error) result += `    Error: ${job.error}\n`;
          result += `\n`;
        });
      }

      resolve(result.trim());
    });
  }
}

// Global download manager instance
export const downloadManager = new DownloadManager();
