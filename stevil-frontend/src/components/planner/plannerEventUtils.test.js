import test from "node:test";
import assert from "node:assert/strict";
import { exerciseSourceUrl, updatePlannerEvent } from "./plannerEventUtils.js";

const event = { id: "1", kind: "EXERCISE", title: "걷기", details: "가벼운 활동", intensity: "가볍게",
    exerciseId: "walking", exerciseCategory: "aerobic", exerciseDifficulty: "beginner",
    exerciseEquipment: "없음", exerciseImpact: "low", exerciseEvidence: [{ evidenceId: "who" }] };

test("completion and time edits preserve exercise evidence", () => {
    for (const change of [{ completed: true }, { start: "2026-09-07T19:30" }, { title: "걷기" }]) {
        assert.deepEqual(updatePlannerEvent(event, change).exerciseEvidence, event.exerciseEvidence);
    }
});

test("content, type and intensity changes detach stale exercise metadata", () => {
    for (const change of [{ title: "달리기" }, { details: "다른 설명" }, { kind: "MEAL" }, { intensity: "보통" }]) {
        const result = updatePlannerEvent(event, change);
        assert.deepEqual(result.exerciseEvidence, []);
        assert.equal(result.exerciseId, null);
        assert.equal(result.exerciseEquipment, null);
    }
    assert.equal(event.exerciseEvidence.length, 1);
});

test("only HTTPS links to actual source hosts are clickable", () => {
    const valid = "https://pmc.ncbi.nlm.nih.gov/articles/PMC8365734/#obr13273-tbl-0003";
    assert.equal(exerciseSourceUrl(valid), valid);
    for (const value of ["javascript:alert(1)", "https://pmc.ncbi.nlm.nih.gov.evil.test/", "https://evil.test/", "http://www.who.int/", "https://user@www.who.int/", null]) {
        assert.equal(exerciseSourceUrl(value), null);
    }
});
