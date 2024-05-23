import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Injectable, NotFoundException } from '@nestjs/common';
import { isArray, reduce, toNumber } from 'lodash';

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { SessionsService } from '../sessions.service';
import { SphereSession } from '../schema';
import { WebSearchTopics } from 'src/constants';
import { uniqBy } from 'lodash';

// import { Cron } from '@nestjs/schedule';

const LINKEN_SHPERE_URL = 'http://127.0.0.1:40080/sessions';

const EVENTS = {
  SESSION_LIVE: 'linken.sphere.session.live',
};

class SessionCreatedEvent {
  public readonly payload: {
    session_id: string;
    debug_port: string;
    last_topic_of_search: string;
    _id: string;
  };
  constructor(public session: SphereSession) {
    this.payload = {
      _id: session.id,
      session_id: session.session_id,
      debug_port: session.debug_port,
      last_topic_of_search: session.last_topic_of_search,
    };
  }
}

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

type SphereApiSession = {
  name: string;
  uuid: string;
  status: string;
};

@Injectable()
export class AutomationService {
  constructor(
    private sessionsService: SessionsService,
    private httpService: HttpService,
    private eventEmitter: EventEmitter2,
  ) {}
  private readonly logger = new Logger();
  private browser: puppeteer.Browser;

  private logEvent(event: string, data: any) {
    this.logger.log(data, `Event: ${event}`);
  }

  async syncSessions() {
    try {
      const response = await this.httpService.axiosRef.get(
        `${LINKEN_SHPERE_URL}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const sessions = response?.data as SphereApiSession[];

      if (isArray(sessions) && sessions.length > 0) {
        for (let i = 0; i < sessions.length; i++) {
          const session = sessions[i];

          try {
            const payload = {
              session_id: session.uuid,
              name: session.name,
              status: session.status === 'stopped' ? 'IDLE' : 'ACTIVE',
            };

            const existingSession =
              await this.sessionsService.findOneBySessionId(session.uuid);

            if (existingSession) {
              await this.sessionsService.updateOne(existingSession.id, payload);
            } else {
              const debug_port = await this.sessionsService.getNextDebugPort();
              await this.sessionsService.createOne({
                ...payload,
                debug_port: `${debug_port}`,
              });
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async createAndSaveLinkenSphereSession() {
    const debugPort = await this.sessionsService.getNextDebugPort();

    try {
      const response = await this.httpService.axiosRef.post(
        `${LINKEN_SHPERE_URL}/create_quick`,
      );

      const data = response?.data?.[0];
      const session = await this.sessionsService.createOne({
        session_id: data.uuid,
        name: data.name,
        debug_port: `${debugPort}`,
      });

      this.logEvent('CREATE_SESSION', session);

      return session;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async startLinkenSphereSessions(_id: string) {
    try {
      const session = await this.sessionsService.findOne(_id);

      if (session.status === 'ACTIVE') {
        this.logEvent('SESSION_ALREADY_ACTIVE', session);
        this.eventEmitter.emit(EVENTS.SESSION_LIVE, session);
        return session;
      }

      const response = await this.httpService.axiosRef.post(
        `${LINKEN_SHPERE_URL}/start`,
        {
          _id: session.id,
          uuid: session.session_id,
          headless: false,
          debug_port: toNumber(session.debug_port),
        },
      );

      const { data } = response;

      if (data?.uuid) {
        const _s = await this.sessionsService.updateOne(_id, {
          status: 'ACTIVE',
        });
        this.logEvent(`START_SESSION`, {
          id: _id,
          session_id: session.session_id,
        });
        const event = new SessionCreatedEvent(_s);
        this.eventEmitter.emit(EVENTS.SESSION_LIVE, event);
      }

      return response?.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async stopLinkenSphereSession(_id: string) {
    try {
      const session = await this.sessionsService.findOne(_id);

      const response = await this.httpService.axiosRef.post(
        `${LINKEN_SHPERE_URL}/stop`,
        {
          uuid: session.session_id,
        },
      );

      const { data } = response;

      if (data) {
        const _s = await this.sessionsService.updateOne(_id, {
          status: 'IDLE',
        });
        this.logEvent('STOP_SESSION', {
          id: _id,
          session_id: session.session_id,
          status: _s.status,
        });
      }
    } catch (error) {
      throw new NotFoundException(error?.response?.data?.message);
    }
  }

  async createSessions(count = 5) {
    for (let i = 0; i < count; i++) {
      await this.createAndSaveLinkenSphereSession();
    }
    this.logEvent('CREATE_SESSIONS', { count });
  }

  async startSessions(count = 5) {
    const sessions = await this.sessionsService.findManyIdleByUserId(count);

    for (let i = 0; i < count; i++) {
      const session = sessions[i];

      if (session?.id) {
        try {
          await this.startLinkenSphereSessions(session?.id);
        } catch (error) {
          console.log(error);
        }
      }
    }

    this.logEvent('START_SESSIONS', { count });
  }

  async endSessions() {
    const sessions = await this.sessionsService.findManyActiveByUserId();

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      if (session?.id) {
        try {
          await this.stopLinkenSphereSession(session.id);
        } catch (error) {
          console.log(error);
        }
      }
    }

    this.logEvent('END_SESSIONS', { count: sessions.length });
  }

  private async connectToBrowser(debugPort: number) {
    try {
      this.browser = await puppeteer.connect({
        browserURL: `http://localhost:${debugPort}`,
      });

      console.log({
        message: 'Connected to browser',
        browser: await this.browser?.version().then((version) => version),
      });

      return this.browser;
    } catch (error) {
      console.error(error);
    }
  }

  private async getWebsiteLinksToScrape(searchTerm: string) {
    const query = searchTerm.replace(/\s+/g, '+');
    const url = `https://www.google.com/search?q=${query}`;

    const { data } = await this.httpService.axiosRef.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      },
    });

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

  @OnEvent(EVENTS.SESSION_LIVE)
  async warmUpSession(event: SessionCreatedEvent) {
    const { session_id, debug_port, last_topic_of_search, _id } = event.payload;
    try {
      const currentTopics = await this.sessionsService.getLastTopicsOfSearch();
      const allTopics = reduce(
        WebSearchTopics,
        (acc, topics) => [...acc, ...topics],
        [],
      ).filter(
        (topic) =>
          topic !== last_topic_of_search && !currentTopics.includes(topic),
      );

      const topic = allTopics[Math.floor(Math.random() * allTopics.length)];
      this.logEvent('WARM_UP_SESSION', { session_id, debug_port, topic, _id });

      const browser = await this.connectToBrowser(toNumber(debug_port));
      // delay 2.5 seconds
      const page = await browser.pages().then((pages) => pages?.[0]);

      if (!page) {
        throw new NotFoundException(
          'Did not find any open pages in the browser, please open a page first',
        );
      }

      // delay for 5 seconds
      const linksToVisit = await this.getWebsiteLinksToScrape(topic);

      const startTimes = new Date().getTime();

      for (let i = 0; i < linksToVisit.length; i++) {
        const link = linksToVisit[i];
        try {
          await page.goto(link.url, {
            waitUntil: 'load',
            timeout: 90000,
          });

          this.logger.log(`WEBPAGE VISITED: ${link.domain}`);
        } catch (e) {
          console.error(e);
        }
        //delay for 2 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const endTimes = new Date().getTime();

      await this.sessionsService.updateOne(_id, {
        last_topic_of_search: topic,
        last_activity: new Date(),
      });

      await this.stopLinkenSphereSession(_id);
      this.logEvent('WARM_UP_SESSION_COMPLETED', {
        session_id,
        topic,
        no_of_links: linksToVisit.length,
        timeTaken: `${(endTimes - startTimes) / 1000} seconds`,
      });
    } catch (error) {
      console.error(error);
      await this.stopLinkenSphereSession(_id);
    }
  }

  //start 5 sessions every 30 minutes
  //   @Cron('0 */30 * * * *')
  //   async handleCron() {
  //     this.startSessions(3);
  //   }
}
