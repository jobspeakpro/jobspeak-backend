
import fs from "fs";
import path from "path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import ffmpegStatic from "ffmpeg-static";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
}) : null;

// FFmpeg setup
let ffmpegPath = null;
let ffmpegPathResolved = false;

function testFfmpegWithSpawn(binaryPath) {
    return new Promise((resolve) => {
        const proc = spawn(binaryPath, ['-version'], {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let timeout;
        proc.on('close', (code) => {
            clearTimeout(timeout);
            resolve({ success: code === 0 });
        });
        proc.on('error', () => {
            clearTimeout(timeout);
            resolve({ success: false });
        });
        timeout = setTimeout(() => {
            proc.kill();
            resolve({ success: false });
        }, 5000);
    });
}

// Lazy resolve function - no top-level side effects
async function resolveFfmpeg() {
    if (ffmpegPathResolved) return;

    try {
        if (process.env.FFMPEG_PATH) {
            const test = await testFfmpegWithSpawn(process.env.FFMPEG_PATH);
            if (test.success) ffmpegPath = process.env.FFMPEG_PATH;
        }
        if (!ffmpegPath) {
            const test = await testFfmpegWithSpawn('ffmpeg');
            if (test.success) ffmpegPath = 'ffmpeg';
        }
        if (!ffmpegPath && ffmpegStatic) {
            const test = await testFfmpegWithSpawn(ffmpegStatic);
            if (test.success) ffmpegPath = ffmpegStatic;
        }
        if (ffmpegPath) console.log("[AudioTranscriber] FFmpeg resolved:", ffmpegPath);
        else console.warn("[AudioTranscriber] FFmpeg NOT found.");
    } catch (e) {
        console.error("[AudioTranscriber] Error resolving FFmpeg:", e);
    } finally {
        ffmpegPathResolved = true;
    }
}

async function transcodeToWav(inputPath) {
    if (!ffmpegPathResolved) {
        await new Promise(r => setTimeout(r, 1000)); // wait a bit
    }
    if (!ffmpegPath) throw new Error("FFmpeg not available");

    const outputPath = inputPath + ".wav";
    const args = ['-y', '-i', inputPath, '-ac', '1', '-ar', '16000', '-f', 'wav', outputPath];

    await execFileAsync(ffmpegPath, args, { windowsHide: true });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new Error("Transcoding failed: Output empty or missing");
    }
    return outputPath;
}

export async function transcribeAudioFile(fileObject) {
    if (!openai) throw new Error("OpenAI API Key missing");

    const { path: filePath, mimetype, originalname } = fileObject;
    let finalPath = filePath;
    let finalMime = mimetype;
    let finalName = originalname || "audio.wav";

    // Check if needs transcoding (webm/ogg typically)
    const needsTranscoding = mimetype.includes("webm") || mimetype.includes("ogg");

    if (needsTranscoding) {
        console.log("[AudioTranscriber] Transcoding", mimetype, "to WAV");
        finalPath = await transcodeToWav(filePath);
        finalMime = "audio/wav";
        finalName = "audio.wav";
    }

    // OpenAI Transcribe
    const stream = fs.createReadStream(finalPath);
    const openaiFile = await toFile(stream, finalName, { type: finalMime });

    const resp = await openai.audio.transcriptions.create({
        file: openaiFile,
        model: "whisper-1"
    });

    return resp.text || "";
}
