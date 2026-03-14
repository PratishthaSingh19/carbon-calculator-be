export function calculateCarbon(payload) {
    // Dummy implementation for carbon calculation
    const totalDurationSeconds = payload.totalDurationSeconds;
    const SECONDS_IN_HOUR = 3600;
    const RUNNER_POWER_KW = 0.2; // 200 watts
    const CARBON_INTENSITY_G_PER_KWH = 400; // gCO2 per kWh

    const durationInHours = totalDurationSeconds / SECONDS_IN_HOUR;
    const energyConsumedKWh = durationInHours * RUNNER_POWER_KW;
    const estimatedCO2Grams = energyConsumedKWh * CARBON_INTENSITY_G_PER_KWH;

    return {
        totalDurationSeconds,
        estimatedCO2Grams,
    };
}
