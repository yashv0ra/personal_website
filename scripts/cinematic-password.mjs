// Authenticate through the same form as visitors, never by bypassing the gate.
export async function unlockCinematic(page) {
  await page.getByLabel('Password', { exact: true }).fill(process.env.CINEMATIC_PASSWORD || '1111');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.locator('main[data-stage]').waitFor();
}
