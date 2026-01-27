import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Minimal Server Running" });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        ok: true,
        service: "Minimal Server",
        commit: process.env.RAILWAY_GIT_COMMIT_SHA || "unknown"
    });
});

console.log(`[MINIMAL] Starting on port ${PORT}`);
app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MINIMAL] Listening on 0.0.0.0:${PORT}`);
});
