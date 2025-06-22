# FFmpeg Setup and Troubleshooting

FFmpeg is required for video processing operations, especially for the `download_speedy` tool that merges video/audio streams and applies speed adjustments.

## Installation

### Windows

**Option 1: Using winget (Recommended)**
```bash
winget install ffmpeg
```

**Option 2: Manual Installation**
1. Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Choose "Windows" and download a static build
3. Extract the archive to `C:\ffmpeg`
4. Add `C:\ffmpeg\bin` to your system PATH:
   - Open System Properties → Advanced → Environment Variables
   - Edit the "Path" variable and add `C:\ffmpeg\bin`
   - Restart your command prompt/terminal

**Option 3: Using Chocolatey**
```bash
choco install ffmpeg
```

### macOS

**Option 1: Using Homebrew (Recommended)**
```bash
brew install ffmpeg
```

**Option 2: Using MacPorts**
```bash
sudo port install ffmpeg
```

**Option 3: Manual Installation**
1. Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extract and move to `/usr/local/bin/`
3. Make executable: `chmod +x /usr/local/bin/ffmpeg`

### Linux

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**CentOS/RHEL/Fedora:**
```bash
# Fedora
sudo dnf install ffmpeg

# CentOS/RHEL (requires EPEL repository)
sudo yum install epel-release
sudo yum install ffmpeg
```

**Arch Linux:**
```bash
sudo pacman -S ffmpeg
```

**From Source (All Linux distributions):**
```bash
# Install dependencies first
sudo apt install build-essential yasm cmake libtool libc6 libc6-dev unzip wget libnuma1 libnuma-dev

# Download and compile
wget https://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2
tar xjvf ffmpeg-snapshot.tar.bz2
cd ffmpeg
./configure
make
sudo make install
```

## Verification

After installation, verify FFmpeg is working:

```bash
ffmpeg -version
```

You should see output similar to:
```
ffmpeg version 4.4.2 Copyright (c) 2000-2021 the FFmpeg developers
built with gcc 9 (Ubuntu 9.4.0-1ubuntu1~20.04.1)
```

## Common Issues and Solutions

### FFmpeg Not Found

**Error:** `ffmpeg: command not found` or `'ffmpeg' is not recognized`

**Solutions:**
1. **Check PATH:** Ensure FFmpeg is in your system PATH
   ```bash
   # Check if ffmpeg is in PATH
   which ffmpeg  # Linux/macOS
   where ffmpeg  # Windows
   ```

2. **Reinstall FFmpeg** using your package manager

3. **Manual PATH setup** (if needed):
   ```bash
   # Linux/macOS - Add to ~/.bashrc or ~/.zshrc
   export PATH="/usr/local/bin:$PATH"
   
   # Windows - Add to system environment variables
   # C:\ffmpeg\bin (or wherever you installed it)
   ```

### Permission Issues

**Error:** Permission denied when running FFmpeg

**Solutions:**
```bash
# Linux/macOS - Make executable
chmod +x /usr/local/bin/ffmpeg

# Or run with sudo if needed
sudo ffmpeg [options]
```

### Codec Issues

**Error:** `Unknown encoder` or codec not supported

**Solutions:**
1. **Check available codecs:**
   ```bash
   ffmpeg -codecs
   ffmpeg -encoders
   ```

2. **Install full FFmpeg build** (not minimal):
   ```bash
   # Ubuntu - install full version
   sudo apt install ffmpeg-full
   
   # macOS - reinstall with all options
   brew uninstall ffmpeg
   brew install ffmpeg --with-all-options
   ```

### Performance Issues

**Issue:** Slow video processing

**Solutions:**
1. **Use hardware acceleration** (if available):
   ```bash
   # NVIDIA GPU
   ffmpeg -hwaccel nvenc [other options]
   
   # Intel Quick Sync
   ffmpeg -hwaccel qsv [other options]
   
   # AMD GPU
   ffmpeg -hwaccel vaapi [other options]
   ```

2. **Optimize CPU usage:**
   ```bash
   # Use multiple threads
   ffmpeg -threads 4 [other options]
   
   # Or auto-detect CPU cores
   ffmpeg -threads 0 [other options]
   ```

3. **Use faster presets:**
   ```bash
   # For x264 encoding
   ffmpeg -preset ultrafast [other options]
   ```

### Memory Issues

**Error:** Out of memory during processing

**Solutions:**
1. **Process in segments** for large files
2. **Reduce video resolution** during processing
3. **Use streaming mode** instead of loading entire file:
   ```bash
   ffmpeg -f lavfi -i "movie=input.mp4" [other options]
   ```

## yt-search Specific Configuration

### Video Speed Processing

The `download_speedy` tool uses these FFmpeg filters:

```bash
# Video speed adjustment
-filter:v "setpts=${1/speedMultiplier}*PTS"

# Audio speed adjustment  
-filter:a "atempo=${speedMultiplier}"
```

### Supported Formats

The tool works with these formats:
- **Input:** MP4, WebM, MKV, AVI, MOV
- **Output:** MP4 (H.264 video, AAC audio)

### Quality Settings

Default encoding settings used:
```bash
-c:v libx264    # Video codec
-c:a aac        # Audio codec
-crf 23         # Video quality (lower = better)
-preset medium  # Encoding speed vs quality
```

## Troubleshooting yt-search Issues

### Download Speedy Failures

**Check FFmpeg installation:**
```bash
ffmpeg -version
```

**Test basic FFmpeg operation:**
```bash
ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=30 test.mp4
```

**Check available filters:**
```bash
ffmpeg -filters | grep -E "(setpts|atempo)"
```

### Audio/Video Sync Issues

If speed-adjusted videos have sync problems:

1. **Update FFmpeg** to latest version
2. **Use different audio filter:**
   ```bash
   # Alternative to atempo
   -af "asetrate=44100*${speedMultiplier},aresample=44100"
   ```

### Large File Processing

For very large videos:

1. **Increase buffer sizes:**
   ```bash
   -bufsize 2M -maxrate 2M
   ```

2. **Use two-pass encoding:**
   ```bash
   # First pass
   ffmpeg -i input.mp4 -pass 1 -f null /dev/null
   # Second pass  
   ffmpeg -i input.mp4 -pass 2 output.mp4
   ```

## Getting Help

- [FFmpeg Official Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg Wiki](https://trac.ffmpeg.org/)
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html)
- [Stack Overflow FFmpeg Tag](https://stackoverflow.com/questions/tagged/ffmpeg)

## Performance Optimization

### Hardware Acceleration

Check if your system supports hardware acceleration:

```bash
# List available hardware accelerators
ffmpeg -hwaccels

# Test NVIDIA NVENC
ffmpeg -f lavfi -i testsrc -t 10 -c:v h264_nvenc test_nvenc.mp4

# Test Intel Quick Sync
ffmpeg -f lavfi -i testsrc -t 10 -c:v h264_qsv test_qsv.mp4
```

### Optimal Settings for yt-search

For best performance with the `download_speedy` tool:

```bash
# Fast encoding preset
export FFMPEG_PRESET="ultrafast"

# Use hardware acceleration if available
export FFMPEG_HWACCEL="auto"

# Optimize for speed over quality
export FFMPEG_CRF="28"
```

These can be added to your shell profile or MCP server environment configuration.
