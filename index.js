const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const downloadPath = path.join(__dirname, "cache", "spotify.mp3");

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
        if (!q) return res.status(400).send("Missing title of the song");

        const r = await axios.get("https://lyrist.vercel.app/api/" + q);
        const { lyrics, title, artist } = r.data;
        const results = await spotify(encodeURI(q));
        let url = results.result.data[0].url;

        const result1 = await spotifydl(url);
        const dl = (
            await axios.get(result1.result, { responseType: "arraybuffer" })
        ).data;
        fs.writeFileSync(downloadPath, Buffer.from(dl, "utf-8"));

        res.json({
            title: title,
            artist: artist,
            lyrics: lyrics,
            downloadLink: result1.result,
            localFilePath: `/cache/spotify.mp3`
        });

        // Clean up the file after 10 minutes to allow enough time for the user to play the audio
        setTimeout(() => {
            if (fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
            }
        }, 10 * 60 * 1000); // 10 minutes
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while processing your request.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
