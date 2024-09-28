const express = require("express");
const { Client } = require("pg");
const flashcards = require("./words.json");

// Set up PostgreSQL client
const client = new Client({
    user: "cloach",
    password: "password",
    database: "words",
    host: "localhost",
    port: 5432,
});

client.connect().then(() => {
    console.log("Connected to PostgreSQL");
}).catch(err => {
    console.error("Connection error", err.stack);
});

const app = express();

app.use(express.json());

// POST /api/users - Add a user
app.post("/api/users", async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: "Username is required." });
    }

    try {
        await client.query(
            "INSERT INTO users (username) VALUES ($1) ON CONFLICT DO NOTHING;",
            [username]
        );
        res.json({ message: "User added successfully" });
    } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/users/:username - Get user
app.get("/api/users/:username", async (req, res) => {
    const username = req.params.username;

    try {
        const result = await client.query(
            "SELECT * FROM users WHERE username = $1;",
            [username]
        );

        if (result.rows.length > 0) {
            res.json({ username: result.rows[0].username });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET /api/cards/:card_id - Get card details
app.get("/api/cards/:card_id", (req, res) => {
    const cardId = parseInt(req.params.card_id);
    const card = flashcards.find((f) => f.id === cardId);

    if (card) {
        res.json(card);
    } else {
        res.status(404).json({ message: "Card not found" });
    }
});

// GET /api/users/:username/cards - Get user progress info
app.get("/api/users/:username/cards", async (req, res) => {
    const username = req.params.username;

    try {
        const result = await client.query(
            "SELECT * FROM user_flashcards WHERE username = $1;",
            [username]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching user cards:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PUT /api/users/:username/cards/:cardId - Update or create user interaction info
app.put("/api/users/:username/cards/:cardId", async (req, res) => {
    const username = req.params.username;
    const cardId = parseInt(req.params.cardId);
    const { confidence } = req.body;

    if (confidence === undefined) {
        return res.status(400).json({ error: "Confidence level is required." });
    }

    const timeLastAccessed = new Date().toISOString();

    try {
        await client.query(`
        INSERT INTO user_flashcards (username, card_id, confidence, time_last_accessed)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username, card_id) DO UPDATE 
        SET confidence = EXCLUDED.confidence, time_last_accessed = EXCLUDED.time_last_accessed;
      `, [username, cardId, confidence, timeLastAccessed]);

        res.json({ message: "Flashcard interaction updated" });
    } catch (error) {
        console.error("Error updating flashcard interaction:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(8000, () => {
    console.log("Server running on http://localhost:8000");
});
