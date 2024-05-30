import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { uniq, uniqBy } from 'lodash';

import { HttpService } from '@nestjs/axios';

function extractSecondDomain(urls: string[]) {
  return urls
    .map((url) => {
      try {
        const urlObj = new URL(url);
        const urlParam = new URLSearchParams(urlObj.search);
        const targetUrl = urlParam.get('url');
        if (targetUrl) {
          const targetUrlObj = new URL(targetUrl);
          return targetUrlObj.hostname;
        }
      } catch (error) {
        return null;
      }
      return null;
    })
    .filter((domain) => domain !== null);
}

@Injectable()
export class AppService {
  private browser: puppeteer.Browser;

  constructor(private readonly httpService: HttpService) {
    // this.connectToBrowser();
  }

  private async connectToBrowser() {
    try {
      this.browser = await puppeteer.connect({
        browserURL: 'http://localhost:12345',
      });

      console.log({
        message: 'Connected to browser',
        browser: await this.browser?.version().then((version) => version),
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        error?.message || 'Failed to connect to browser',
      );
    }
  }
  // private browser: puppeteer.Browser;
  getHello(): string {
    return 'Hello World!';
  }

  async getWebsiteLinksToScrape(searchTerm: string) {
    const query = searchTerm.replace(/\s+/g, '+');
    const url = `https://www.google.com/search?q=${query}`;

    const { data } = await this.httpService
      .get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
      })
      .toPromise();

    // from the search results, get the first 10 links which are not ads preferably ones that have a h3 tag in them

    const $ = cheerio.load(data);
    const links = [];

    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && !href.includes('google.com') && href.includes('http')) {
        links.push(href);
      }
    });

    //extract the exact url from the href
    const cleanedLinks = links.map((link) => {
      const url = new URL(link, 'https://www.google.com');
      return url.href;
    });

    const domains = cleanedLinks.map((link) => ({
      url: link,
      domain: extractSecondDomain([link])[0],
    }));

    return uniqBy(domains, 'domain')?.slice(0, 10);
  }

  async warmUp(searchTerm: string = 'latest news in the us') {
    try {
      const browser = this.browser;
      if (!browser) {
        throw new Error('Failed to connect to browser');
      }

      const page = await browser.pages().then((pages) => pages?.[0]);

      console.log('Page created:', page?.url());

      if (!page) {
        throw new NotFoundException(
          'Did not find any open pages in the browser, please open a page first',
        );
      }

      // delay for 5 seconds
      const linksToVisit = await this.getWebsiteLinksToScrape(searchTerm);

      const startTimes = new Date().getTime();

      for (let i = 0; i < linksToVisit.length; i++) {
        const link = linksToVisit[i];
        await page.goto(link.url, { waitUntil: 'domcontentloaded' });
        //scroll to the bottom of the page

        console.log('Visited:', link.url);
        //delay for 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const endTimes = new Date().getTime();

      console.log({
        message: 'Warm up session completed',
        timeTaken: `${(endTimes - startTimes) / 1000} seconds`,
      });

      return {
        status: 'success',
        message: 'Connected to LinkenSphere',
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        error?.message || 'Failed to connect to LinkenSphere',
      );
    }
  }
}
