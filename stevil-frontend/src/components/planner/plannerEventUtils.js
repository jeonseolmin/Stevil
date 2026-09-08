export function updatePlannerEvent(event, change) {
    const contentChanged = ["title", "details", "kind"].some(key => key in change && change[key] !== event[key]);
    const exerciseChanged = contentChanged || ("intensity" in change && change.intensity !== event.intensity);
    return {
        ...event, ...change,
        foodEvidence: contentChanged ? null : event.foodEvidence,
        ...(exerciseChanged ? {
            exerciseId: null, exerciseCategory: null, exerciseDifficulty: null,
            exerciseEquipment: null, exerciseImpact: null, exerciseEvidence: [],
        } : {}),
    };
}

export function exerciseSourceUrl(value) {
    try {
        const url = new URL(value);
        const hosts = ["www.ncbi.nlm.nih.gov", "pmc.ncbi.nlm.nih.gov", "www.who.int", "iris.who.int",
            "easo.org", "archive.easo.org", "pacompendium.com", "www.cdc.gov"];
        return url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.includes(url.hostname)
            ? url.href : null;
    } catch { return null; }
}
