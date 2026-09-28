import { test, expect } from "@playwright/test";

test.describe("REQ-AUTH-01: 로그인 화면", () => {
    test("소셜 로그인 버튼 3종이 보인다", async ({ page }) => {
        await page.goto("/login");

        await expect(page.getByRole("heading", { name: "건강한 변화의 시작" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Google로 계속하기" })).toBeVisible();
        await expect(page.getByRole("button", { name: "카카오 로그인" })).toBeVisible();
        await expect(page.getByRole("button", { name: "네이버 로그인" })).toBeVisible();
    });

    test("구글 로그인 버튼은 백엔드 OAuth2 엔드포인트로 이동한다", async ({ page }) => {
        await page.goto("/login");

        const [request] = await Promise.all([
            page.waitForRequest((req) => req.url().includes("/oauth2/authorization/google")),
            page.getByRole("button", { name: "Google로 계속하기" }).click(),
        ]);

        expect(request.url()).toContain("/oauth2/authorization/google");
    });
});
