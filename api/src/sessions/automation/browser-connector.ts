import * as puppeteer from 'puppeteer';

export class BrowserConnector {
  private browser: puppeteer.Browser | null = null;

  public async connectToBrowser(
    debugPort: number,
  ): Promise<puppeteer.Browser | null> {
    try {
      this.browser = await puppeteer.connect({
        browserURL: `http://localhost:${debugPort}`,
        protocolTimeout: 60000,
      });

      const version = await this.browser.version();
      console.log({
        message: 'Connected to browser',
        browser: version,
      });

      return this.browser;
    } catch (error) {
      const connection_retry_count = 2;

      for (let i = 0; i < connection_retry_count; i++) {
        console.log('Retrying to connect to browser...');
        try {
          this.browser = await puppeteer.connect({
            browserURL: `http://localhost:${debugPort}`,
            protocolTimeout: 60000,
          });

          const version = await this.browser.version();
          console.log({
            message: 'Connected to browser',
            browser: version,
          });

          return this.browser;
        } catch (error) {
          console.error(
            'Failed to connect to browser:',
            error instanceof Error ? error.message : error,
          );
        }
      }

      console.error(
        'Failed to connect to browser:',
        error instanceof Error ? error.message : error,
      );
      // Return null or handle the error as needed
      return null;
    }
  }
}
