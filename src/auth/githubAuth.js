import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const Router = express.Router();

Router.get("/login", async (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    const scope = "repo%20actions:read";
    const githubAuthUrl = `${process.env.OAUTH_BASE_URL}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    res.redirect(githubAuthUrl);
});

Router.get("/callback", async (req, res) => {
    try {
        const code = req.query.code;

        const tokenResponse = await axios.post(
            `${process.env.OAUTH_BASE_URL}/login/oauth/access_token`,
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.GITHUB_CALLBACK_URL,
            },
            {
                headers: {
                    Accept: "application/json", // ensures GitHub returns JSON
                },
            },
        );

        const accessToken = tokenResponse.data.access_token;
        console.log("GitHub OAuth successful");
        console.log("Access Token:", accessToken);
        req.session.githubToken = accessToken;
        res.redirect(process.env.FRONTEND_BASE_URL);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error exchanging code for token");
    }
});

Router.get("/status", (req, res) => {
    if (req.session?.githubToken) {
        return res.json({ authenticated: true });
    }

    return res.json({ authenticated: false });
});

Router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ error: "Failed to logout" });
        }

        res.clearCookie("connect.sid"); // default session cookie name
        return res.json({ success: true });
    });
});

export default Router;
