const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  try {
    console.log("Taking Admin screenshot...");
    await page.goto('file://' + path.resolve('index.html'));
    await page.waitForSelector('#passwordInput');
    await page.fill('#passwordInput', '0000');
    await page.click('button.lux-btn');
    await page.waitForTimeout(3000); // Wait for data to load
    await page.screenshot({ path: 'C:/Users/user/Desktop/admin_real.png' });
    console.log("Admin done.");

    console.log("Taking Nurse screenshot...");
    await page.goto('file://' + path.resolve('Hemsire.html'));
    await page.waitForSelector('#serviceInp');
    await page.fill('#serviceInp', 'ACIL');
    await page.fill('#nurseInp', 'Hemsire Ayse');
    await page.click('button.lux-btn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:/Users/user/Desktop/nurse_real.png' });
    console.log("Nurse done.");

    console.log("Taking Patron screenshot...");
    await page.goto('file://' + path.resolve('Patron.html'));
    await page.waitForSelector('#bossPass');
    await page.fill('#bossPass', '5656');
    await page.click('button.lux-btn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'C:/Users/user/Desktop/boss_real.png' });
    console.log("Patron done.");

  } catch (e) {
    console.error("Error during screenshot:", e);
  } finally {
    await browser.close();
  }
})();
