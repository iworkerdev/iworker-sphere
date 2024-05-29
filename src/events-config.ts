import { CreateProfileWarmUpDTO } from './iworker-sphere/dto';
import { SphereSession } from './sessions/schema';

export const EVENTS = {
  WARM_UP_SESSIONS: 'sessions.warmup',
  START_SESSION: 'session.start',
  STOP_SESSION: 'session.stop',
  PROFILE_WARM_UP: 'profile.warmup',
  RECORD_PROFILE_WARM_UP: 'profile.warmup.record',
};

export class WarmUpProfileEvent {
  public readonly payload: {
    session_id: string;
    debug_port: string;
    last_topic_of_search: string;
    mongo_id: string;
  };
  constructor(public session: SphereSession) {
    this.payload = {
      mongo_id: session?.id,
      session_id: session?.session_id,
      debug_port: session?.debug_port,
      last_topic_of_search: session?.last_topic_of_search,
    };
  }
}

export class StartSessionEvent {
  public readonly payload: {
    session_id: string;
    debug_port: string;
  };
  constructor(public session: { session_id: string; debug_port: string }) {
    this.payload = {
      session_id: session.session_id,
      debug_port: session.debug_port,
    };
  }
}

export class StopSessionEvent {
  public readonly payload: {
    session_id: string;
  };
  constructor(public session: { session_id: string }) {
    this.payload = {
      session_id: session.session_id,
    };
  }
}

export class ProfileWarmUpEvent {
  public readonly payload: {
    profile_name: string;
  };
  constructor(public event: { profile_name: string }) {
    this.payload = {
      profile_name: event.profile_name,
    };
  }
}

export class RecordProfileWarmUpEvent {
  public readonly payload: CreateProfileWarmUpDTO;
  constructor(public event: CreateProfileWarmUpDTO) {
    this.payload = event;
  }
}
