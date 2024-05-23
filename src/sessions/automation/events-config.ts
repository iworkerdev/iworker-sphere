import { SphereSession } from '../schema';

export const EVENTS = {
  WARM_UP_PROFILE: 'profile.warmup',
  START_SESSION: 'session.start',
  STOP_SESSION: 'session.stop',
};

export class WarmUpProfileEvent {
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
