import { SphereSession } from '../schema';

export const EVENTS = {
  WARM_UP_SESSIONS: 'sessions.warmup',
  START_SESSION: 'session.start',
  STOP_SESSION: 'session.stop',
  PROFILE_WARM_UP: 'profile.warmup',
};

export class WarmUpProfileEvent {
  public readonly payload: {
    session_id: string;
    debug_port: string;
    last_topic_of_search: string;
    mongo_id: string;
  };
  constructor(public session: SphereSession) {
    console.log(
      `session: mongo_id=${session?.id}_session_uuid=${session?.session_id}_debug_port_${session?.debug_port}_last_topic_of_search_${session?.last_topic_of_search}_name_${session?.name}`,
    );
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
