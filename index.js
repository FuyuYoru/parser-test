const randomUseragent = require('random-useragent');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')

const browserOptions = {
	headless: true,
	ignoreHTTPSErrors: true,
	defaultViewport: null,
	slowMo: 0,
	args: [
		'--disable-gpu',
		'--disable-dev-shm-usage',
		'--disable-setuid-sandbox',
		'--no-first-run',
		'--no-sandbox',
		'--no-zygote',
		'--deterministic-fetch',
		'--disable-features=IsolateOrigins',
		'--disable-site-isolation-trials',
	],
};

const csvWriter = createCsvWriter({
	path: 'output.csv',
	header: [
		{ id: 'name', title: 'Наименование' },
		{ id: 'price', title: 'Цена' },
	],
});

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';

async function createPage(browser, url) {

	const UA = randomUseragent.toString();
	const page = await browser.newPage();

	await page.setViewport({
		width: 1920 + Math.floor(Math.random() * 100),
		height: 3000 + Math.floor(Math.random() * 100),
		deviceScaleFactor: 1,
		hasTouch: false,
		isLandscape: false,
		isMobile: false,
	});

	await page.setUserAgent(UA);

	await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

	await page.setRequestInterception(true);
	page.on('request', (req) => {
		if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
			req.abort();
		} else {
			req.continue();
		}
	});

	return page;
}

(async () => {
	const browser = await puppeteer.launch(browserOptions);
	const allProducts = [];
	for (let i = 0; i < 5; i++) {
		const page = await createPage(browser, `https://www.dns-shop.ru/catalog/17a8d26216404e77/vstraivaemye-xolodilniki/?&p=${i + 1}`);
		const pageProducts = await page.evaluate(() => {
			try {
				const productList = [];
				document.querySelectorAll(".catalog-product").forEach((product) => {
					const name = product.querySelector('.catalog-product__name').innerText.trim();
					const price = product.querySelector('.product-buy__price').innerText.trim();
					productList.push({ name, price });
				});
				return productList;
			} catch (err) {
				console.log(err);
			}
		});
		await page.waitForSelector('body');
		allProducts.push(...pageProducts);
		console.log(`Информация о товарах с страницы №${i + 1} успешно собрана и сохранена в output.csv\n Добавлено записей: ${allProducts.length}`);
		await page.close();
	}
	await csvWriter.writeRecords(allProducts);
	await browser.close()
})();
