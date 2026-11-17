import { expect, test, type Page } from '@playwright/test';

// Week 12 pre-deploy smoke test. Five read-only flows through the web version
// with the real Supabase data. Each one checks a promise the app makes.

type Profile = { diets: string[]; allergens: string[] };

// The app keeps the food profile on the device ("foodProfile"); on the web
// that is localStorage. Set it before the app starts, like a returning user.
async function openWithProfile(page: Page, path: string, profile: Profile) {
  await page.addInitScript((saved) => {
    window.localStorage.setItem('foodProfile', JSON.stringify(saved));
  }, profile);
  await page.goto(path);
}

function dishRow(page: Page, nameKo: string) {
  // Each row starts with "<Korean name> · ₩price".
  return page.getByTestId('dish-row').filter({ hasText: `${nameKo} ·` }).first();
}

test('1. the list shows real restaurants, and no test data', async ({ page }) => {
  await openWithProfile(page, '/map', { diets: [], allergens: [] });
  await expect(page.getByText('Sarai Doner Kebab').first()).toBeVisible();
  await expect(page.getByText('Mock Kimbap')).toHaveCount(0);
  await expect(page.getByText('모의 김밥')).toHaveCount(0);
});

test('2. halal: lamb kebab is "Ask first" at Sarai, beer is "Avoid" at Namwol', async ({ page }) => {
  await openWithProfile(page, '/restaurant/r12', { diets: ['halal'], allergens: [] });
  // Sarai is not halal certified, so its meat is "ask first", not "safe".
  await expect(dishRow(page, '양고기 랩 케밥').getByTestId('dish-status')).toHaveText('Ask first');
  // Falafel has no meat and no alcohol: safe.
  await expect(dishRow(page, '팔라펠 플레이트').getByTestId('dish-status')).toHaveText('Safe');

  await page.goto('/restaurant/r10');
  await expect(dishRow(page, '사이공 맥주').getByTestId('dish-status')).toHaveText('Avoid');
});

test('3. vegan: lamb is "Avoid", not "Ask first"', async ({ page }) => {
  await openWithProfile(page, '/restaurant/r12', { diets: ['vegan'], allergens: [] });
  await expect(dishRow(page, '양고기 랩 케밥').getByTestId('dish-status')).toHaveText('Avoid');
});

test('4. peanut allergy: pad thai is hidden at Namwol Pho, and "Show" brings it back', async ({ page }) => {
  await openWithProfile(page, '/restaurant/r10', { diets: [], allergens: ['peanut'] });
  await expect(page.getByText(/menu items hidden because of your allergies/)).toBeVisible();
  await expect(dishRow(page, '팟타이꿍(새우)')).toHaveCount(0);
  await expect(dishRow(page, '소고기쌀국수(퍼보)')).toBeVisible();

  await page.getByText('Show', { exact: true }).click();
  await expect(dishRow(page, '팟타이꿍(새우)').getByTestId('dish-status')).toHaveText('Ask first');
});

test('5. no menu: TriBoTea shows the hint card, the photo button and the guest review card', async ({ page }) => {
  await openWithProfile(page, '/restaurant/r16', { diets: [], allergens: [] });
  await expect(page.getByText('No menu yet').first()).toBeVisible();
  await expect(page.getByText('Menu missing or wrong?')).toBeVisible();
  // A guest can read reviews but must log in to write one.
  await expect(page.getByText('Log in to write a review')).toBeVisible();
});
