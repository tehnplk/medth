const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  
  console.log('Navigating to date selection...');
  await page.goto('http://localhost:3001/booking/date?branch=1');
  
  console.log('Selecting date 19...');
  await page.click('text=19');
  
  console.log('Selecting time 08.30...');
  // Wait for the time slot to appear if it's dynamic
  await page.waitForSelector('text=08.30');
  await page.click('text=08.30');
  
  console.log('Selecting staff...');
  await page.waitForSelector('text=เลือกท่านนี้');
  await page.click('text=เลือกท่านนี้');
  
  console.log('Filling form...');
  await page.waitForSelector('input[name="first_name"]');
  await page.fill('input[name="first_name"]', 'ทดสอบ');
  await page.fill('input[name="last_name"]', 'จองจริง');
  await page.fill('input[name="phone"]', '0812345678');
  
  console.log('Confirming booking...');
  await page.click('button:has-text("ยืนยันการจอง")');
  
  console.log('Waiting for success page...');
  await page.waitForURL('**/booking/success**');
  
  console.log('Taking screenshot...');
  // Ensure QR Code and details are loaded
  await page.waitForTimeout(2000); 
  await page.screenshot({ path: 'booking_success_final.png', fullPage: true });
  
  console.log('Booking successful!');
  await browser.close();
})();
