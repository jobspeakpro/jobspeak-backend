# STT Endpoint Testing Guide

## Production Testing (Railway Direct URL)

Replace `YOUR_RAILWAY_URL` with your actual Railway deployment URL (e.g., `https://your-app.railway.app`).

### Test with "audio" field name:

```bash
curl -X POST https://YOUR_RAILWAY_URL/api/stt \
  -F "audio=@/path/to/your/audio.wav" \
  -F "userKey=test-user-key-123"
```

### Test with "file" field name (alternative):

```bash
curl -X POST https://YOUR_RAILWAY_URL/api/stt \
  -F "file=@/path/to/your/audio.mp3" \
  -F "userKey=test-user-key-123"
```

### Test with WebM file (Chrome MediaRecorder format):

The endpoint automatically converts WebM/Opus files to WAV before sending to OpenAI:

```bash
curl -X POST https://YOUR_RAILWAY_URL/api/stt \
  -F "audio=@/path/to/your/audio.webm" \
  -F "userKey=test-user-key-123"
```

**Note:** WebM files from Chrome MediaRecorder are automatically converted to WAV format on the backend before transcription. The conversion happens transparently - you'll see "STT: converting webm->wav" and "STT: conversion complete, size=..." in the logs.

### Expected Success Response (200 OK):

```json
{
  "transcript": "This is the transcribed text from the audio file."
}
```

### Expected Error Responses:

**Missing file (400):**
```json
{
  "error": "No audio file uploaded"
}
```

**Missing userKey (400):**
```json
{
  "error": "userKey is required and must be a non-empty string"
}
```

**File too large (400):**
```json
{
  "error": "File too large",
  "details": "Maximum file size is 25MB"
}
```

**Missing API key (500):**
```json
{
  "error": "STT misconfigured",
  "missing": ["OPENAI_API_KEY"]
}
```

## Debug Logging

The endpoint now logs comprehensive debug information to help diagnose issues:

- Content-Type header
- Body keys (form fields)
- File metadata (originalname, mimetype, size, fieldname)
- userKey presence and value (truncated for security)
- Full error stacks on failures

Check Railway logs for these debug messages when troubleshooting.

