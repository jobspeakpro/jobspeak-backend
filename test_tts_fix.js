
import fetch from 'node-fetch';

async function testTTS() {
    console.log("Testing /api/tts...");
    const response = await fetch('http://localhost:3000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Hello, this is a test of the Eleven Labs integration." })
    });

    if (!response.ok) {
        console.error("Failed:", response.status, await response.text());
        return;
    }

    const data = await response.json();
    console.log("Response:", JSON.stringify(data).substring(0, 100) + "...");

    if (data.ok && data.audioUrl && data.audioUrl.startsWith("data:audio/mpeg;base64,")) {
        console.log("✅ SUCCESS: Received valid Data URI audio URL.");
        console.log("Audio URL length:", data.audioUrl.length);
    } else {
        console.error("❌ FAILED: Invalid response format.");
        console.log(data);
    }
}

testTTS();
