import { ConfigService } from '@nestjs/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SphereSession } from './schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HandleCatchException } from 'src/utils';
import {
  CreateSphereSessionDTO,
  SessionStatus,
  UpdateSphereSessionDTO,
} from './dto/sphere-session.dto';
import { toNumber } from 'lodash';

@Injectable()
export class SessionsService {
  constructor(
    private configService: ConfigService,
    @InjectModel(SphereSession.name)
    private sphereSessionModel: Model<SphereSession>,
  ) {}

  async findAll() {
    try {
      const sessions = await this.sphereSessionModel.find();
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findOne(id: string) {
    try {
      const session = await this.sphereSessionModel.findById(id);

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      return session;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findOneBySessionId(sessionId: string) {
    try {
      const session = await this.sphereSessionModel.findOne({
        session_id: sessionId,
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      return session;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findOneByDebugPort(debugPort: number) {
    try {
      const session = await this.sphereSessionModel.findOne({
        debug_port: debugPort,
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      return session;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findManyIdleByUserId(count: number) {
    try {
      const sessions = await this.sphereSessionModel
        .find({
          user_id: this.configService.get('USER_ID'),
          status: SessionStatus.STOPPED,
        })
        .limit(count);
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findManyActiveByTypeInDesktop(
    desktopId: string,
    type: string,
  ): Promise<SphereSession[]> {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        status: SessionStatus.AUTOMATION_RUNNING,
        desktop_id: desktopId,
        type,
      });
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findManyActiveByDesktopId(desktopId: string) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        desktop_id: desktopId,
        status: SessionStatus.AUTOMATION_RUNNING,
      });
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async deactivateAllActiveSessions(desktop_id: string) {
    try {
      const sessions = await this.sphereSessionModel.updateMany(
        {
          user_id: this.configService.get('USER_ID'),
          status: SessionStatus.AUTOMATION_RUNNING,
          desktop_id,
        },
        { status: SessionStatus.STOPPED },
      );
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findManyByDesktopId(desktopId: string, filter?: string) {
    const FILTERS = {
      ALL: 'ALL',
      RUNNING: 'RUNNING',
      STOPPED: 'STOPPED',
      AUTOMATION_RUNNING: 'AUTOMATION_RUNNING',
      _100_PERCENT_SUCCESS: '_100_PERCENT_SUCCESS',
      _LESS_THAN_100_PERCENT_SUCCESS: '_LESS_THAN_100_PERCENT_SUCCESS',
    };
    try {
      switch (filter) {
        case FILTERS.ALL: {
          return this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
          });
        }
        case FILTERS.RUNNING: {
          return await this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
            status: SessionStatus.RUNNING,
          });
        }
        case FILTERS.STOPPED: {
          return await this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
            status: SessionStatus.STOPPED,
          });
        }
        case FILTERS.AUTOMATION_RUNNING: {
          return await this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
            status: SessionStatus.AUTOMATION_RUNNING,
          });
        }
        case FILTERS._100_PERCENT_SUCCESS: {
          return await this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
            last_activity: { $ne: null },
            last_run_success_rate: '100%',
          });
        }
        case FILTERS._LESS_THAN_100_PERCENT_SUCCESS: {
          return await this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
            last_activity: { $ne: null },
            last_run_success_rate: { $ne: '100%' },
          });
        }
        default: {
          return this.sphereSessionModel.find({
            user_id: this.configService.get('USER_ID'),
            desktop_id: desktopId,
          });
        }
      }
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findManyActiveByUserId(count?: number) {
    try {
      let sessions = [];

      if (count) {
        sessions = await this.sphereSessionModel
          .find({
            user_id: this.configService.get('USER_ID'),
            status: SessionStatus.AUTOMATION_RUNNING,
          })
          .limit(count);
      } else {
        await this.sphereSessionModel.find({
          user_id: this.configService.get('USER_ID'),
          status: SessionStatus.AUTOMATION_RUNNING,
        });
      }

      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getNextDebugPort(desktopId: string) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        desktop_id: desktopId,
      });

      if (sessions.length === 0) {
        return 8095;
      }

      const debugPorts = sessions.map((session) =>
        toNumber(session.debug_port),
      );
      return Math.max(...debugPorts) + 1;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getNextSessionExecutionId() {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
      });

      if (sessions.length === 0) {
        return 1541;
      }

      const sessionExecutionIds = sessions.map((session) =>
        toNumber(session.session_execution_id),
      );
      return Math.max(...sessionExecutionIds) + 1;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getHighestExecutionIdForDesktop(desktop_id: string) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        desktop_id: desktop_id,
      });

      if (sessions.length === 0) {
        return 1541;
      }

      const sessionExecutionIds = sessions.map((session) =>
        toNumber(session.session_execution_id),
      );
      return Math.max(...sessionExecutionIds);
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getInitialExecutionId(desktop_id: string) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        desktop_id: desktop_id,
      });

      const allSessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
      });

      if (allSessions.length === 0) {
        return 1541;
      }

      if (sessions.length === 0) {
        const sessionExecutionIds = allSessions.map((session) =>
          toNumber(session.session_execution_id),
        );
        return Math.min(...sessionExecutionIds);
      }

      const sessionExecutionIds = sessions.map((session) =>
        toNumber(session.session_execution_id),
      );
      return Math.min(...sessionExecutionIds);
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getHighestExecutionBatchIdForDesktop(desktopId: string) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        desktop_id: desktopId,
      });

      if (sessions.length === 0) {
        return 1;
      }

      const sessionExecutionBatchIds = sessions.map((session) =>
        toNumber(session.session_execution_batch_id),
      );
      return Math.max(...sessionExecutionBatchIds);
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getHighestExecutionIdInExecutionBatch(
    executionBatchId: number,
    desktopId: string,
  ) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        session_execution_batch_id: executionBatchId,
        desktop_id: desktopId,
      });

      if (sessions.length === 0) {
        return 1541;
      }

      const sessionExecutionIds = sessions.map((session) =>
        toNumber(session.session_execution_id),
      );
      return Math.max(...sessionExecutionIds);
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findAllWhereExecutionIdIsGreaterThan(
    executionId: number,
    desktopId: string,
  ) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        session_execution_id: { $gt: executionId },
        desktop_id: desktopId,
      });
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getAllDesktops() {
    try {
      const desktops = await this.sphereSessionModel
        .find({
          user_id: this.configService.get('USER_ID'),
        })
        .distinct('desktop_name');
      return desktops;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getSelectedDesktop(profile_name: string) {
    try {
      const desktop = await this.sphereSessionModel.findOne({
        user_id: this.configService.get('USER_ID'),
        desktop_name: profile_name,
      });

      if (!desktop) {
        return null;
      }

      return {
        desktop_name: desktop?.desktop_name,
        desktop_id: desktop?.desktop_id,
        team_name: desktop?.team_name,
      };
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async findSessionsForCurrentExecution(
    executionId: number,
    desktopId: string,
  ) {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        session_execution_id: { $gt: executionId },
        desktop_id: desktopId,
      });
      return sessions;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async createOne(session: CreateSphereSessionDTO) {
    try {
      const newSession = new this.sphereSessionModel({
        ...session,
        user_id: this.configService.get('USER_ID'),
        session_execution_id: await this.getNextSessionExecutionId(),
      });
      return newSession.save();
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async updateOne(id: string, session: UpdateSphereSessionDTO) {
    try {
      const updatedSession = this.sphereSessionModel.findByIdAndUpdate(
        id,
        session,
        { new: true },
      );

      if (!updatedSession) {
        throw new NotFoundException('Session not found');
      }

      return updatedSession;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async updateOneBySessionId(
    sessionId: string,
    session: UpdateSphereSessionDTO,
  ) {
    try {
      const updatedSession = this.sphereSessionModel.findOneAndUpdate(
        { session_id: sessionId },
        session,
        { new: true },
      );

      if (!updatedSession) {
        throw new NotFoundException('Session not found');
      }

      return updatedSession;
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async deleteOne(id: string) {
    try {
      const deletedSession =
        await this.sphereSessionModel.findByIdAndDelete(id);

      if (!deletedSession) {
        throw new NotFoundException('Session not found');
      }

      return { id: deletedSession._id, message: 'Session deleted' };
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async deleteMany(ids: string[]) {
    try {
      const deletedSessions = await this.sphereSessionModel.deleteMany({
        _id: { $in: ids },
      });

      if (deletedSessions.deletedCount === 0) {
        throw new NotFoundException('Sessions not found');
      }

      return { ids, message: 'Sessions deleted' };
    } catch (error) {
      return HandleCatchException(error);
    }
  }

  async getLastTopicsOfSearch() {
    try {
      const sessions = await this.sphereSessionModel.find({
        user_id: this.configService.get('USER_ID'),
        last_topic_of_search: { $ne: null },
      });

      const topics = sessions.map((session) => session.last_topic_of_search);
      return topics;
    } catch (error) {
      return HandleCatchException(error);
    }
  }
}
