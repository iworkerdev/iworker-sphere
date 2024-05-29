import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer-core';

import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { chunk, filter, isArray, map, reduce, sortBy, toNumber } from 'lodash';

import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { SessionsService } from '../sessions.service';
import {
  ProfileWarmUpSequence,
  ProfileWarmUpSequenceStatus,
  SessionsExecutionConfig,
} from '../schema';
import { WebSearchTopics } from 'src/constants';
import { uniqBy } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EVENTS,
  ProfileWarmUpEvent,
  RecordProfileWarmUpEvent,
  StopSessionEvent,
  WarmUpProfileEvent,
} from '../../events-config';
import { HandleCatchException, __delay__ } from 'src/utils';
import { LoggerService } from 'src/logger/logger.service';

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
          return targetUrlObj.hostname || url;
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
    private loggerService: LoggerService,
    private httpService: HttpService,
    private eventEmitter: EventEmitter2,
    @InjectModel(SessionsExecutionConfig.name)
    private sessionsExecutionConfigModel: Model<SessionsExecutionConfig>,
    @InjectModel(ProfileWarmUpSequence.name)
    private profileWarmUpSequenceModel: Model<ProfileWarmUpSequence>,
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
  private browser: puppeteer.Browser | null = null;

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
      const data = JSON.stringify({
        status: 'running',
      });

      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://127.0.0.1:40080/sessions',
        headers: {
          'Content-Type': 'application/json',
        },
        data: data,
      };

      const response = await this.httpService.axiosRef.request(config);
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

      const session_chunks = chunk(__sessions__, 5);

      const sessions_in_db = await this.sessionsService.findManyByDesktopId(
        activeDesktop?.uuid,
      );

      const sessions_to_delete = filter(sessions_in_db, (session) => {
        return !__sessions__.find((s) => s.uuid === session.session_id);
      });

      if (sessions_to_delete.length > 0) {
        const _ids = sessions_to_delete.map((s) => s.id);
        await this.sessionsService.deleteMany(_ids);
      }

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
                  payload,
                );
                results.push(s_updated);
              } else {
                const debug_port = await this.sessionsService.getNextDebugPort(
                  activeDesktop?.uuid,
                );
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

      this.logEvent('SYNC_SESSIONS', {
        count: results.length,
        desktop: activeDesktop?.name,
      });

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
          uuid: session.session_id,
          headless: false,
          debug_port: toNumber(session.debug_port),
        },
      );

      const { data } = response;

      console.log({
        data,
      });

      if (data?.uuid) {
        const _s = await this.sessionsService.updateOne(_id, {
          status: 'ACTIVE',
          last_activity: new Date(),
        });
        return _s;
      } else {
        return null;
      }
    } catch (error) {
      console.error({
        message: `Error starting session ${_id} - ${error?.message}`,
        error: error?.response?.data || error?.message,
      });
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
          session_execution_id: session.session_execution_id,
          status: _s.status,
        });

        const activeSessions =
          await this.sessionsService.findManyActiveByDesktopId(
            session.desktop_id,
          );

        const highestExecutionIdInExecutionBatch =
          await this.sessionsService.getHighestExecutionIdInExecutionBatch(
            session?.session_execution_batch_id,
            session?.desktop_id,
          );

        const isLastSession =
          highestExecutionIdInExecutionBatch >= highestExecutionId;

        if (!isLastSession && activeSessions.length === 0) {
          const e = new ProfileWarmUpEvent({
            profile_name: activeDesktop?.name,
          });
          this.eventEmitter.emit(EVENTS.PROFILE_WARM_UP, e);
          console.log({
            message: `Starting sessions for desktop ${activeDesktop?.name} New Execution Batch ${session?.session_execution_batch_id + 1}`,
            highestExecutionId,
            highestExecutionIdInExecutionBatch,
          });
        } else if (isLastSession && activeSessions.length === 0) {
          console.log({
            message: `End Of Warmup for profile ${activeDesktop?.name}`,
            highestExecutionId,
            highestExecutionIdInExecutionBatch,
          });
          try {
            this.executeNextProfileSequenceDesktop(session.desktop_id);
          } catch (error) {}
        }
      }
    } catch (error) {
      throw new NotFoundException(
        error?.response?.data
          ? JSON.stringify(error?.response?.data)
          : error.message,
      );
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
        protocolTimeout: 60000,
      });

      const version = await this.browser.version();
      console.log({
        message: 'Connected to browser',
        browser: version,
      });

      return this.browser;
    } catch (error) {
      console.error(error);
      return null;
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

  @OnEvent(EVENTS.WARM_UP_SESSIONS)
  async warmUpSession(event: WarmUpProfileEvent) {
    const { session_id, debug_port, last_topic_of_search, mongo_id } =
      event.payload;

    const __session__ = await this.sessionsService.findOne(mongo_id);

    try {
      const getTopicOfSearch = async () => {
        const currentTopics =
          await this.sessionsService.getLastTopicsOfSearch();
        const allTopics = reduce(
          WebSearchTopics,
          (acc, topics) => [...acc, ...topics],
          [],
        ).filter(
          (topic) =>
            topic !== last_topic_of_search && !currentTopics.includes(topic),
        );

        const topic = allTopics[Math.floor(Math.random() * allTopics.length)];
        return topic;
      };

      const browser = await this.connectToBrowser(toNumber(debug_port));
      const visitedLinks = [];

      const browse = async (url: string) => {
        // delay 2.5 seconds
        await __delay__(3000);

        const [page] = await browser.pages();

        if (!page) {
          throw new NotFoundException(
            'Did not find any open pages in the browser, please open a page first',
          );
        }

        if (page.isClosed()) {
          // create a new page and use it
          const _page_ = await browser.newPage();
          const visited = await Promise.all([
            _page_.goto(url, {
              waitUntil: 'load',
              timeout: 600000,
            }),
            // page.waitForNavigation(),
          ]);
          visitedLinks.push(url);
          return visited;
        } else {
          const visited = await Promise.all([
            page.goto(url, {
              waitUntil: 'load',
              timeout: 60000,
            }),
            // page.waitForNavigation(),
          ]);

          visitedLinks.push(url);
          return visited;
        }
      };

      const topic_of_search_v1 = await getTopicOfSearch();
      // delay for 5 seconds
      const linksToVisit =
        await this.getWebsiteLinksToScrape(topic_of_search_v1);

      const warm_up_end_time = new Date().getTime();

      const warm_up = async (links: any[]) => {
        for (let i = 0; i < links.length; i++) {
          if (visitedLinks.length >= 10) {
            break;
          }

          const link = links[i];
          try {
            // Check if the page is still available
            await browse(link.url);
            this.logger.log(`WEBPAGE VISITED: ${link.domain}`);
            await __delay__(3000); // Custom delay function
          } catch (e) {
            const error_log_payload = {
              session_id: mongo_id,
              message: 'ERROR visiting webpage',
              log_type: 'ERROR',
              error: e.message,
              link,
              verbose_error: e,
            };
            await this.loggerService.createSessionExecutionErrorLog(
              `PAGE_VISIT_FAILED`,
              error_log_payload,
            );

            // Retry logic
            for (let retry = 0; retry < 3; retry++) {
              await __delay__(2000); // Wait before retrying
              try {
                await browse(link.url);
                this.logger.log(
                  `WEBPAGE VISITED on retry ${retry + 1}: ${link.domain}`,
                );
                await __delay__(3000); // Custom delay function
                break; // Exit retry loop if successful
              } catch (retryError) {
                const retry_error_log_payload = {
                  session_id: mongo_id,
                  message: 'ERROR visiting webpage on retry',
                  error: retryError.message,
                  log_type: 'ERROR',
                  link,
                  verbose_error: retryError,
                };

                await this.loggerService.createSessionExecutionErrorLog(
                  `PAGE_VISIT_RETRY_FAILED`,
                  retry_error_log_payload,
                );
              }
            }
          }
        }
      };

      await warm_up(linksToVisit);
      //if links to visit is less than 10, try again

      console.log({
        visited_links_count: visitedLinks.length,
      });

      if (visitedLinks.length < 10) {
        const topic_of_search_v2 = await getTopicOfSearch();
        const linksToVisit_v2 =
          await this.getWebsiteLinksToScrape(topic_of_search_v2);
        await warm_up(linksToVisit_v2);
      }

      const warm_up_start_time = new Date().getTime();

      await this.sessionsService.updateOne(mongo_id, {
        last_topic_of_search: topic_of_search_v1,
        last_activity: new Date(),
      });

      const warm_up_payload = {
        team_name: __session__.team_name,
        desktop_name: __session__.desktop_name,
        desktop_id: __session__.desktop_id,
        session_name: __session__.name,
        session_id,
        visited_links_count: visitedLinks.length,
        visited_links_domains: map(extractSecondDomain(visitedLinks)),
        execution_time_in_ms: warm_up_start_time - warm_up_end_time,
        warm_up_end_time: new Date(warm_up_start_time),
        warmup_start_time: new Date(warm_up_end_time),
        user_id: __session__.user_id,
      };

      const recordWarmUpEvent = new RecordProfileWarmUpEvent(warm_up_payload);
      this.eventEmitter.emit(EVENTS.RECORD_PROFILE_WARM_UP, recordWarmUpEvent);

      const stopSessionEvent = new StopSessionEvent({ session_id });
      this.eventEmitter.emit(EVENTS.STOP_SESSION, stopSessionEvent);
    } catch (error) {
      console.error(error);
    }
  }

  async getExecutionConfig(desktop_id: string, desktop_name: string) {
    try {
      const config = await this.sessionsExecutionConfigModel.findOne({
        desktop_id,
      });

      if (!config) {
        const _config = await this.sessionsExecutionConfigModel.create({
          last_execution_id:
            (await this.sessionsService.getInitialExecutionId(desktop_id)) - 1,
          last_execution_date: new Date(),
          execution_interval: 10,
          executions_per_interval: 5,
          desktop_id,
          desktop_name,
        });

        return _config;
      } else {
        return config;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  @OnEvent(EVENTS.PROFILE_WARM_UP)
  async handleProfileWarmUpEvent(event: ProfileWarmUpEvent) {
    const { profile_name } = event.payload;
    await this.syncSessions();
    await this.executeWarmUpForSessionsForActiveDesktop(profile_name);
  }

  async executeWarmUpForSessionsForActiveDesktop(profile_name: string) {
    try {
      const desktop =
        await this.sessionsService.getSelectedDesktop(profile_name);

      if (!desktop) {
        return;
      }

      const config = await this.getExecutionConfig(
        desktop.desktop_id,
        desktop.desktop_name,
      );

      let sessions = await this.sessionsService.findSessionsForCurrentExecution(
        config.last_execution_id,
        desktop.desktop_id,
      );

      let startExecutionId = config.last_execution_id;

      if (sessions.length === 0) {
        //reset the last execution id

        startExecutionId =
          (await this.sessionsService.getInitialExecutionId(
            desktop.desktop_id,
          )) - 1;

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
          desktop.desktop_id,
        );
      }

      const sessionToWarmUp = sessions.slice(0, config.executions_per_interval);

      const lastSessionExecutionId =
        sessionToWarmUp[sessionToWarmUp.length - 1]?.session_execution_id;

      for (let i = 0; i < sessionToWarmUp.length; i++) {
        const session = sessionToWarmUp[i];
        try {
          if (session.id) {
            const startedSessionInstance = await this.startLinkenSphereSession(
              session.id,
            );

            if (startedSessionInstance) {
              const event = new WarmUpProfileEvent(session);
              this.eventEmitter.emit(EVENTS.WARM_UP_SESSIONS, event);
            }
          }
        } catch (error) {
          console.error(error);
        }
      }

      await this.sessionsExecutionConfigModel.findByIdAndUpdate(config.id, {
        last_execution_id: lastSessionExecutionId,
        last_execution_date: new Date(),
      });
    } catch (error) {
      console.log(error);
    }
  }

  async executeProfileWarmUpSequence(desktop_id: string, desktop_name: string) {
    await this.changeActiveDesktop(desktop_id);

    //wait for 90 seconds
    await __delay__(90000);

    const event = new ProfileWarmUpEvent({
      profile_name: desktop_name,
    });

    this.eventEmitter.emit(EVENTS.PROFILE_WARM_UP, event);
  }

  async getHighestProfileSequenceID() {
    const highestSequence = await this.profileWarmUpSequenceModel
      .findOne()
      .sort({ sequence_number: -1 })
      .exec();
    return highestSequence?.sequence_number || 0;
  }

  async executeNextProfileSequenceDesktop(current_desktop_id: string) {
    console.log('Executing next profile sequence desktop', current_desktop_id);

    try {
      const sequence = await this.profileWarmUpSequenceModel.findOne({
        status: 'RUNNING',
      });

      const desktop = sequence?.desktop_profiles.find(
        (profile) => profile.desktop_id === current_desktop_id,
      );

      if (!desktop) {
        return;
      }

      await this.profileWarmUpSequenceModel.findByIdAndUpdate(
        sequence.id,
        {
          'desktop_profiles.$[element].status':
            ProfileWarmUpSequenceStatus.COMPLETED,
        },
        {
          arrayFilters: [{ 'element.desktop_id': current_desktop_id }],
        },
      );

      const nextDesktop = sequence?.desktop_profiles.find(
        (profile) =>
          profile.execution_sequence === desktop.execution_sequence + 1,
      );

      if (!nextDesktop) {
        await this.profileWarmUpSequenceModel.findByIdAndUpdate(sequence.id, {
          status: 'COMPLETED',
          finished_at: new Date(),
        });
        return;
      }

      await this.profileWarmUpSequenceModel.findByIdAndUpdate(
        sequence.id,
        {
          'desktop_profiles.$[element].status': 'RUNNING',
        },
        {
          arrayFilters: [{ 'element.desktop_id': nextDesktop.desktop_id }],
        },
      );

      await this.executeProfileWarmUpSequence(
        nextDesktop.desktop_id,
        nextDesktop.desktop_name,
      );
    } catch (error) {
      console.error(error);
    }
  }

  async bulkWarmUp(desktop_names: string[]) {
    try {
      const NEW_PROFILE_SEQUENCE_ID =
        (await this.getHighestProfileSequenceID()) + 1;

      const desktops = await this.getDesktops();

      const desktopsToWarmUp = filter(desktops, (desktop) =>
        desktop_names.includes(desktop.name),
      );

      // sort by how the desktops_names are passed
      const _desktopsToWarmUp = sortBy(desktopsToWarmUp, (desktop) =>
        desktop_names.indexOf(desktop.name),
      );

      const desktop_profiles = map(_desktopsToWarmUp, (desktop, index) => ({
        desktop_id: desktop.uuid,
        desktop_name: desktop.name,
        status: 'IDLE',
        execution_sequence: index + 1,
        started_at: null,
        finished_at: null,
      }));

      // format sequence id from sequence number to PWS-00000001
      function formatSequenceId(sequence_number: number) {
        return `PWS-${sequence_number.toString().padStart(8, '0')}`;
      }

      // If there is a running sequence, return
      const runningSequence = await this.profileWarmUpSequenceModel.findOne({
        status: 'RUNNING',
      });

      if (runningSequence) {
        throw new NotAcceptableException(
          'There is a running sequence, please wait for it to complete before starting a new one.',
        );
      }

      const sequence = await this.profileWarmUpSequenceModel.create({
        sequence_id: formatSequenceId(NEW_PROFILE_SEQUENCE_ID),
        sequence_number: NEW_PROFILE_SEQUENCE_ID,
        status: 'IDLE',
        desktop_profiles,
      });

      // start sequence
      const desktop = sortBy(
        sequence.desktop_profiles,
        'execution_sequence',
      )[0];

      // update sequence status to running
      await this.profileWarmUpSequenceModel.findByIdAndUpdate(
        sequence.id,
        {
          status: 'RUNNING',
          started_at: new Date(),
        },
        { new: true },
      );

      // update desktop status to running
      const executingSequence =
        await this.profileWarmUpSequenceModel.findByIdAndUpdate(
          sequence.id,
          {
            'desktop_profiles.$[element].status': 'RUNNING',
          },
          {
            arrayFilters: [{ 'element.desktop_id': desktop.desktop_id }],
            new: true,
          },
        );

      await this.executeProfileWarmUpSequence(
        desktop.desktop_id,
        desktop.desktop_name,
      );

      return executingSequence;
    } catch (error) {
      return HandleCatchException(error);
    }
  }
}
