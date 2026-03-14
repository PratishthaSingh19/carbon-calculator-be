import express from "express";
import axios from "axios";
import { calculateCarbon } from "../services/carbon/carbonCalculation.js";

const Router = express.Router();

// Helper to normalize runner labels
const normalizeRunner = (labels = []) => {
    const label = labels.join(" ").toLowerCase();
    if (label.includes("ubuntu")) return "ubuntu";
    if (label.includes("windows")) return "windows";
    if (label.includes("macos")) return "macos";
    return "unknown";
};

// Function moved outside for reuse
export async function getWorkflowJobs(workflowRunId, token, owner, repo) {
    if (!token) throw new Error("Unauthorized");
    const jobsData = await axios.get(
        `${process.env.GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${workflowRunId}/jobs`,
        {
            headers: { Authorization: `Bearer ${token}` },
        },
    );

    const jobs = jobsData.data.jobs || [];

    const processedJobs = jobs.map((job) => {
        if (!job.started_at || !job.completed_at) {
            return {
                jobId: job.id,
                name: job.name,
                runner: normalizeRunner(job.labels),
                status: job.status,
                startedAt: job.started_at,
                completedAt: job.completed_at,
                durationSeconds: 0,
                inProgress: true,
            };
        }

        const startedAt = new Date(job.started_at);
        const completedAt = new Date(job.completed_at);
        const durationSeconds = Math.max(
            0,
            (completedAt.getTime() - startedAt.getTime()) / 1000,
        );

        return {
            jobId: job.id,
            name: job.name,
            runner: normalizeRunner(job.labels),
            status: job.status,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            durationSeconds,
            inProgress: false,
        };
    });

    const totalDurationSeconds = processedJobs.reduce(
        (acc, job) => acc + job.durationSeconds,
        0,
    );

    const carbonData = calculateCarbon({
        workflowRunId,
        jobs: processedJobs,
        totalDurationSeconds,
    });

    return { processedJobs, totalDurationSeconds, carbonData };
}

// Get all workflow runs
Router.get("/:owner/:repo/workflows", async (req, res) => {
    try {
        const token = req.session.githubToken;
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const owner = req.params.owner;
        const repo = req.params.repo;

        const workflowsData = await axios.get(
            `${process.env.GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs`,
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );

        return res.json(workflowsData.data);
    } catch (error) {
        console.error(error.response?.data || error.message);
        return res.status(500).json({ error: "Failed to fetch workflows" });
    }
});

Router.get("/:owner/:repo/workflows/:workflowId/summary", async (req, res) => {
    try {
        const token = req.session.githubToken;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { owner, repo, workflowId } = req.params;

        const summary = await getWorkflowJobs(workflowId, token, owner, repo);
        const summaryData = {
            workflowRunId: req.params.workflowId,
            totalJobs: summary.processedJobs.length,
            totalDurationSeconds: summary.totalDurationSeconds,
            carbon: summary.carbonData.estimatedCO2Grams,
            runnerTypes: [
                ...new Set(summary.processedJobs.map((job) => job.runner)),
            ],
            jobs: summary.processedJobs,
        };
        return res.json(summaryData);
    } catch (error) {
        console.error(error.response?.data || error.message);
        return res
            .status(500)
            .json({ error: "Failed to fetch workflow summary" });
    }
});

// Get full workflow jobs and carbon data
Router.get("/:owner/:repo/workflows/:workflowId", async (req, res) => {
    try {
        const workflowRunId = req.params.workflowId;
        const token = req.session.githubToken;
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const { processedJobs, totalDurationSeconds, carbonData } =
            await getWorkflowJobs(
                workflowRunId,
                token,
                req.params.owner,
                req.params.repo,
            );

        return res.json({
            workflowRunId,
            totalJobs: processedJobs.length,
            totalDurationSeconds,
            jobs: processedJobs,
            carbon: carbonData,
        });
    } catch (error) {
        console.error(error.response?.data || error.message);
        if (error.response?.status === 404)
            return res.status(404).json({ error: "Workflow run not found" });
        if (error.response?.status === 403)
            return res
                .status(403)
                .json({ error: "GitHub API rate limit or access denied" });
        return res.status(500).json({ error: "Failed to fetch workflow jobs" });
    }
});

export default Router;
