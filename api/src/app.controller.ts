import { Body, Controller, Get, Post } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('sphere/warm-up')
  async startWarmUpSession(@Body('searchTerm') searchTerm: string) {
    this.appService.warmUp(searchTerm);
    return {
      message:
        'Connecting to LinkenSphere... This may take a while. Please wait.',
    };
  }

  @Post('search')
  async getWebsiteLinksToScrape(@Body('searchTerm') searchTerm: string) {
    return await this.appService.getWebsiteLinksToScrape(searchTerm);
  }
}
