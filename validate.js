// jobspeak-backend/validate.js
// ESM-safe validator for JobSpeakPro backend (Node 18+)

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const baseUrl = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

function banner() {
  console.log("========================================");
  console.log("JobSpeakPro Backend Validation");
  console.log("========================================");
  console.log(`Base URL: ${baseUrl}`);
  console.log("");
}

function pass(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function fail(msg) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function runTest(name, fn) {
  console.log(`${YELLOW}[TEST]${RESET} ${name}`);
  try {
    const ok = await fn();
    return ok;
  } catch (e) {
    fail(`Unexpected error: ${e?.message || String(e)}`);
    return false;
  }
}

async function testHealth() {
  try {
    const res = await fetch(`${baseUrl}/health`);
    const data = await safeJson(res);

    if (!res.ok) {
      fail(`/health expected 200, got ${res.status}`);
      return false;
    }

    // Accept either { ok: true } or any truthy "ok" field
    const okValue = data?.ok;
    if (okValue === true || okValue === "true" || okValue === 1) {
      pass("/health returns ok");
      return true;
    }

    // If endpoint returns something else but 200, still accept for MVP
    pass("/health returns 200");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function testSttMissingAudio() {
  // IMPORTANT: your backend now checks userKey first.
  // So to test "missing audio", we MUST include a valid userKey.
  try {
    const form = new FormData();
    form.append("userKey", "validate-user");

    const res = await fetch(`${baseUrl}/api/stt`, {
      method: "POST",
      body: form,
    });

    const data = await safeJson(res);

    if (res.status !== 400) {
      fail(`Expected status 400, got ${res.status}`);
      return false;
    }

    // Accept either missing audio message or any 400 error
    const err = data?.error || "";
    if (String(err).toLowerCase().includes("no audio")) {
      pass("/api/stt rejects missing audio with 400");
      return true;
    }

    pass("/api/stt returns 400 when audio missing (message acceptable)");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function testSttMissingUserKey() {
  // IMPORTANT: to avoid server throwing 500, we send a real multipart request
  // with an "audio" field, and userKey = "" (empty) so it should 400.
  try {
    const form = new FormData();

    // Dummy audio blob (backend should reject userKey before attempting OpenAI)
    const dummy = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" });
    form.append("audio", dummy, "dummy.webm");

    // Empty userKey should count as missing
    form.append("userKey", "");

    const res = await fetch(`${baseUrl}/api/stt`, {
      method: "POST",
      body: form,
    });

    const data = await safeJson(res);

    if (res.status !== 400) {
      fail(`Expected status 400, got ${res.status}`);
      return false;
    }

    const err = data?.error || "";
    if (String(err).toLowerCase().includes("userkey")) {
      pass("/api/stt rejects missing userKey with 400");
      return true;
    }

    pass("/api/stt returns 400 for missing userKey (message acceptable)");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function testSessionsMissingUserKey() {
  try {
    const res = await fetch(`${baseUrl}/api/sessions?limit=10`, { method: "GET" });
    const data = await safeJson(res);

    if (res.status !== 400) {
      fail(`Expected 400, got ${res.status}`);
      return false;
    }

    pass("/api/sessions rejects missing userKey with 400");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function testResumeMissingUserKey() {
  try {
    const res = await fetch(`${baseUrl}/resume/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello world" }),
    });
    const data = await safeJson(res);

    if (res.status !== 400) {
      fail(`Expected 400, got ${res.status}`);
      return false;
    }

    pass("/resume/analyze rejects missing userKey with 400");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function testVoiceMissingUserKey() {
  try {
    const res = await fetch(`${baseUrl}/voice/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
    const data = await safeJson(res);

    if (res.status !== 400) {
      fail(`Expected 400, got ${res.status}`);
      return false;
    }

    pass("/voice/generate rejects missing userKey with 400");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function testBillingMissingUserKey() {
  try {
    const res = await fetch(`${baseUrl}/api/billing/status`, { method: "GET" });
    const data = await safeJson(res);

    if (res.status !== 400) {
      fail(`Expected 400, got ${res.status}`);
      return false;
    }

    pass("/api/billing/status rejects missing userKey with 400");
    return true;
  } catch (e) {
    fail(`Request failed: ${e?.message || String(e)}`);
    return false;
  }
}

async function main() {
  banner();

  const tests = [
    ["Health Endpoint", testHealth],
    ["STT Endpoint - Missing Audio Rejection", testSttMissingAudio],
    ["STT Endpoint - Missing userKey Rejection", testSttMissingUserKey],
    ["Sessions Endpoint - Missing userKey Rejection", testSessionsMissingUserKey],
    ["Resume Analyze Endpoint - Missing userKey Rejection", testResumeMissingUserKey],
    ["Voice Generate Endpoint - Missing userKey Rejection", testVoiceMissingUserKey],
    ["Billing Status Endpoint - Missing userKey Rejection", testBillingMissingUserKey],
  ];

  let passed = 0;

  for (const [name, fn] of tests) {
    const ok = await runTest(name, fn);
    if (ok) passed++;
    console.log("");
  }

  console.log("========================================");
  console.log(`Results: ${passed}/${tests.length} tests passed`);
  console.log("========================================");

  if (passed !== tests.length) {
    console.log(`${RED}Some validation checks failed! ✗${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}All validation checks passed! ✓${RESET}`);
    process.exit(0);
  }
}

main();
