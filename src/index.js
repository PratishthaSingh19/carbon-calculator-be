import express from "express";
import gitHubRoutes from "./api/gitHubRoutes.js";
import githubAuth from "./auth/githubAuth.js";
import session from "express-session";
import cors from "cors";

const app = express();
app.use(express.json());

const requiredEnv = [
    "GITHUB_API_BASE",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GITHUB_CALLBACK_URL",
    "SESSION_SECRET",
    "FRONTEND_BASE_URL",
];
requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        console.error(`❌ Missing environment variable: ${key}`);
        process.exit(1);
    }
});
app.use(
    cors({
        origin: process.env.FRONTEND_BASE_URL, // frontend URL
        credentials: true, // allow cookies
    }),
);

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 5 minutes
            httpOnly: true,
            // sameSite: "none", // "lax" REQUIRED for OAuth redirect in local host
            // secure: true, // must be false for localhost (http)
            sameSite: "lax", // "lax" REQUIRED for OAuth redirect in local host
            secure: false, // must be false for localhost (http)
        },
    }),
);

app.get("/test", async (req, res) => {
    res.send("Test endpoint is working!");
});

app.use("/github", gitHubRoutes);
app.use("/auth/github", githubAuth);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
