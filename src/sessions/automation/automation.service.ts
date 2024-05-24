import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Injectable, NotFoundException } from '@nestjs/common';
import { chunk, filter, isArray, omit, reduce, toNumber } from 'lodash';

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { SessionsService } from '../sessions.service';
import { SessionsExecutionConfig } from '../schema';
import { WebSearchTopics } from 'src/constants';
import { uniqBy } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EVENTS,
  ProfileWarmUpEvent,
  StopSessionEvent,
  WarmUpProfileEvent,
} from './events-config';

const LINKEN_SHPERE_URL = 'http://127.0.0.1:40080/sessions';

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

type Desktop = {
  uuid: string;
  name: string;
  team_name: string;
  is_active: boolean;
};

@Injectable()
export class AutomationService {
  constructor(
    private sessionsService: SessionsService,
    private httpService: HttpService,
    private eventEmitter: EventEmitter2,
    @InjectModel(SessionsExecutionConfig.name)
    private sessionsExecutionConfigModel: Model<SessionsExecutionConfig>,
  ) {
    async function signInToLinkenSphere() {
      try {
        await httpService.axiosRef.post(`http://127.0.0.1:40080/auth/signin`, {
          email: process.env.LINKEN_SPHERE_EMAIL_ADDRESS,
          password: process.env.LINKEN_SPHERE_PASSWORD,
          autologin: true,
        });
      } catch (error) {
        console.error(error?.response?.data);
      }
    }
    signInToLinkenSphere();
  }
  private readonly logger = new Logger();
  private browser: puppeteer.Browser;

  private logEvent(event: string, data: any) {
    this.logger.log(data, `Event: ${event}`);
  }

  async getDesktops(): Promise<Desktop[]> {
    try {
      const desktops = await this.httpService.axiosRef.get(
        `http://localhost:40080/desktops`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const desktopsData = desktops?.data as Desktop[];

      return desktopsData;
    } catch (error) {
      return [];
    }
  }

  async changeActiveDesktop(desktopId: string) {
    try {
      await this.httpService.axiosRef.post(`http://localhost:40080/desktops`, {
        uuid: desktopId,
      });

      return this.getActiveDesktop();
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async getActiveDesktop() {
    const desktopsData = (await this.getDesktops()) as Desktop[];

    const activeDesktop = filter(desktopsData, (desktop) => desktop?.is_active);

    return activeDesktop?.length > 0 ? activeDesktop?.[0] : null;
  }

  async getRunningSessions() {
    try {
      const response = await this.httpService.axiosRef.get(
        `${LINKEN_SHPERE_URL}`,
        {
          data: {
            status: 'running',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const sessions = response?.data as SphereApiSession[];

      return sessions;
    } catch (error) {
      console.error({
        message: 'Error fetching sessions' + error?.message,
        error: error.response?.data,
      });
      return [];
    }
  }

  async syncSessions() {
    try {
      const activeDesktop = await this.getActiveDesktop();

      if (!activeDesktop) {
        console.error('No active desktop found');
      }

      const response = await this.httpService.axiosRef.get(
        `${LINKEN_SHPERE_URL}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const results = [];

      const session_execution_batch_id =
        await this.sessionsService.getHighestExecutionBatchIdForDesktop(
          activeDesktop?.uuid,
        );

      const __sessions__ = response?.data as SphereApiSession[];

      const session_chunks = chunk(__sessions__, 10);

      for (let k = 0; k < session_chunks?.length; k++) {
        const sessions = session_chunks[k];

        const batchId = session_execution_batch_id + k;

        if (isArray(sessions) && sessions.length > 0) {
          for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];

            try {
              const payload = {
                session_id: session.uuid,
                name: session.name,
                status: session.status === 'stopped' ? 'IDLE' : 'ACTIVE',
                team_name: activeDesktop?.team_name || 'Unknown',
                desktop_id: activeDesktop?.uuid || 'Unknown',
                desktop_name: activeDesktop?.name || 'Unknown',
                session_execution_batch_id: batchId,
              };

              let existingSession = null;

              try {
                existingSession = await this.sessionsService.findOneBySessionId(
                  session.uuid,
                );
              } catch (error) {}

              if (existingSession) {
                const s_updated = await this.sessionsService.updateOne(
                  existingSession.id,
                  omit(payload, ['session_execution_batch_id']),
                );
                results.push(s_updated);
              } else {
                const debug_port =
                  await this.sessionsService.getNextDebugPort();
                const s_new = await this.sessionsService.createOne({
                  ...payload,
                  debug_port: `${debug_port}`,
                });
                results.push(s_new);
              }
            } catch (error) {
              console.error(error);
              console.error({
                message: 'Error syncing session',
                session,
                error: error.response?.data,
              });
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error({
        message: 'Error fetching sessions' + error?.message,
        error: error.response?.data,
      });
    }
  }

  async startLinkenSphereSession(_id: string) {
    try {
      const session = await this.sessionsService.findOne(_id);

      if (session.status === 'ACTIVE') {
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
          last_activity: new Date(),
        });
        return _s;
      }
      return session;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  @OnEvent(EVENTS.STOP_SESSION)
  async stopLinkenSphereSession(event: StopSessionEvent) {
    const { session_id } = event.payload;
    try {
      const session = await this.sessionsService.findOneBySessionId(session_id);
      const activeDesktop = await this.getActiveDesktop();
      const highestExecutionId =
        await this.sessionsService.getHighestExecutionIdForDesktop(
          activeDesktop?.uuid,
        );

      const response = await this.httpService.axiosRef.post(
        `${LINKEN_SHPERE_URL}/stop`,
        {
          uuid: session.session_id,
        },
      );

      const { data } = response;

      if (data) {
        const _s = await this.sessionsService.updateOne(session.id, {
          status: 'IDLE',
        });
        this.logEvent('STOP_SESSION', {
          session_id: session.session_id,
          status: _s.status,
        });

        const runningSessions = await this.getRunningSessions();

        const highestExecutionIdInExecutionBatch =
          await this.sessionsService.getHighestExecutionIdInExecutionBatch(
            session?.session_execution_batch_id,
            session?.desktop_id,
          );

        const canStartNewWarmUpBatch =
          highestExecutionIdInExecutionBatch === highestExecutionId &&
          runningSessions.length === 0 &&
          session?.session_execution_id !== highestExecutionId;

        console.log({
          highestExecutionIdInExecutionBatch,
          highestExecutionId,
          runningSessions,
          canStartNewWarmUpBatch,
        });

        if (
          canStartNewWarmUpBatch &&
          session?.desktop_id === activeDesktop?.uuid
        ) {
          const e = new ProfileWarmUpEvent({
            profile_name: activeDesktop?.name,
          });
          this.eventEmitter.emit(EVENTS.PROFILE_WARM_UP, e);
        }
      }
    } catch (error) {
      throw new NotFoundException(error?.response?.data?.message);
    }
  }

  async createSessions(_count = 10) {
    try {
      await this.httpService.axiosRef.post(
        `${LINKEN_SHPERE_URL}/create_quick`,
        {
          count: _count < 10 ? 10 : 10,
        },
      );

      return await this.syncSessions();
    } catch (error) {
      console.error(error);
    }
  }

  async startSessions(count = 5) {
    const sessions = await this.sessionsService.findManyIdleByUserId(count);

    for (let i = 0; i < count; i++) {
      const session = sessions[i];

      if (session?.id) {
        try {
          await this.startLinkenSphereSession(session?.id);
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
        const stopSessionEvent = new StopSessionEvent({
          session_id: session.session_id,
        });
        this.eventEmitter.emit(EVENTS.STOP_SESSION, stopSessionEvent);
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

    return uniqBy(domains, 'domain')?.slice(0, 5);
  }

  @OnEvent(EVENTS.WARM_UP_SESSIONS)
  async warmUpSession(event: WarmUpProfileEvent) {
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
      this.logger.log(
        `WARM_UP_SESSION_STARTED: topic=${topic} - session_id=${session_id}`,
      );

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

      const stopSessionEvent = new StopSessionEvent({ session_id });
      this.eventEmitter.emit(EVENTS.STOP_SESSION, stopSessionEvent);
      this.logger.log(
        `WARM_UP_SESSION_COMPLETED: topic=${topic} - session_id=${session_id} - no_of_links=${linksToVisit.length} - timeTaken=${(endTimes - startTimes) / 1000} seconds`,
      );
    } catch (error) {
      const stopSessionEvent = new StopSessionEvent({ session_id });
      this.eventEmitter.emit(EVENTS.STOP_SESSION, stopSessionEvent);
      console.error(error);
    }
  }

  async getExecutionConfig() {
    try {
      const config = await this.sessionsExecutionConfigModel.find();

      if (config.length === 0) {
        const _config = await this.sessionsExecutionConfigModel.create({
          last_execution_id:
            (await this.sessionsService.getInitialExecutionId()) - 1,
          last_execution_date: new Date(),
          execution_interval: 10,
          executions_per_interval: 10,
        });

        return _config;
      } else {
        return config?.[0];
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async executeWarmUpForSessions() {
    const config = await this.getExecutionConfig();
    let sessions =
      await this.sessionsService.findAllWhereExecutionIdIsGreaterThan(
        config.last_execution_id,
      );

    let startExecutionId = config.last_execution_id;

    if (sessions.length === 0) {
      //reset the last execution id

      startExecutionId =
        (await this.sessionsService.getInitialExecutionId()) - 1;

      const updatedConfig =
        await this.sessionsExecutionConfigModel.findByIdAndUpdate(
          config.id,
          {
            last_execution_id: startExecutionId,
            last_execution_date: new Date(),
          },
          { new: true },
        );

      sessions =
        await this.sessionsService.findAllWhereExecutionIdIsGreaterThan(
          updatedConfig.last_execution_id,
        );
    }

    const sessionToWarmUp = sessions.slice(0, config.executions_per_interval);

    const lastSessionExecutionId =
      sessionToWarmUp[sessionToWarmUp.length - 1]?.session_execution_id;

    console.log({
      startExecutionId,
      lastSessionExecutionId,
    });

    for (let i = 0; i < sessionToWarmUp.length; i++) {
      const session = sessionToWarmUp[i];
      try {
        const _s = await this.startLinkenSphereSession(session.id);
        const event = new WarmUpProfileEvent(_s);
        this.eventEmitter.emit(EVENTS.WARM_UP_SESSIONS, event);
      } catch (error) {
        console.error(error);
      }
    }

    await this.sessionsExecutionConfigModel.findByIdAndUpdate(config.id, {
      last_execution_id: lastSessionExecutionId,
      last_execution_date: new Date(),
    });
  }

  @OnEvent(EVENTS.PROFILE_WARM_UP)
  async handleProfileWarmUpEvent(event: ProfileWarmUpEvent) {
    const { profile_name } = event.payload;
    await this.executeWarmUpForSessionsForActiveDesktop(profile_name);
  }

  async executeWarmUpForSessionsForActiveDesktop(profile_name: string) {
    const config = await this.getExecutionConfig();

    const desktop = await this.sessionsService.getSelectedDesktop(profile_name);

    if (!desktop) {
      return;
    }

    let sessions = await this.sessionsService.findSessionsForCurrentExecution(
      config.last_execution_id,
      profile_name,
    );

    let startExecutionId = config.last_execution_id;

    if (sessions.length === 0) {
      //reset the last execution id

      startExecutionId =
        (await this.sessionsService.getInitialExecutionId()) - 1;

      const updatedConfig =
        await this.sessionsExecutionConfigModel.findByIdAndUpdate(
          config.id,
          {
            last_execution_id: startExecutionId,
            last_execution_date: new Date(),
          },
          { new: true },
        );

      sessions = await this.sessionsService.findSessionsForCurrentExecution(
        updatedConfig.last_execution_id,
        profile_name,
      );
    }

    const sessionToWarmUp = sessions.slice(0, config.executions_per_interval);

    const lastSessionExecutionId =
      sessionToWarmUp[sessionToWarmUp.length - 1]?.session_execution_id;

    console.log({
      startExecutionId,
      lastSessionExecutionId,
    });

    for (let i = 0; i < sessionToWarmUp.length; i++) {
      const session = sessionToWarmUp[i];
      try {
        const _s = await this.startLinkenSphereSession(session.id);
        const event = new WarmUpProfileEvent(_s);
        this.eventEmitter.emit(EVENTS.WARM_UP_SESSIONS, event);
      } catch (error) {
        console.error(error);
      }
    }

    await this.sessionsExecutionConfigModel.findByIdAndUpdate(config.id, {
      last_execution_id: lastSessionExecutionId,
      last_execution_date: new Date(),
    });
  }

  // start 5 sessions every 30 minutes
  // @Cron('0 */35 * * * *')
  // async handleCron() {
  //   this.startSessions(3);
  // }
}
