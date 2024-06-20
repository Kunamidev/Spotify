const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const cacheDir = path.join(__dirname, "cache");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use('/cache', express.static('cache'));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/spotify", async (req, res) => {
    try {
        const { spotify, spotifydl } = require("betabotz-tools");
        let q = req.body.title;
        if (!q) return res.status(400).send("Missing title of the album");

        const r = await axios.get("https://lyrist.vercel.app/api/" + q);
        const { lyrics, title, artist } = r.data;
        const results = await spotify(encodeURI(q));

        const tracks = results.result.data.slice(0, 10); // Limiting to 10 tracks for this example
        const trackUrls = [];

        for (const track of tracks) {
            const result1 = await spotifydl(track.url);
            const dl = (
                await axios.get(result1.result, { responseType: "arraybuffer" })
            ).data;

            const trackPath = path.join(cacheDir, `${track.title}.mp3`);
            fs.writeFileSync(trackPath, Buffer.from(dl, "utf-8"));
            trackUrls.push({
                title: track.title,
                path: `/cache/${track.title}.mp3`
            });
        }

        res.json({
            title: title,
            artist: artist,
            lyrics: lyrics,
            tracks: trackUrls
        });

        // Clean up files after 10 minutes
        setTimeout(() => {
            trackUrls.forEach(track => {
                const trackPath = path.join(__dirname, "cache", path.basename(track.path));
                if (fs.existsSync(trackPath)) {
                    fs.unlinkSync(trackPath);
                }
            });
        }, 10 * 60 * 1000); // 10 minutes
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while processing your request.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
