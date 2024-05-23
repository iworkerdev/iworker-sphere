import * as dotenv from 'dotenv';

import { merge } from 'lodash';

dotenv.config();

type CurrentEnvironment = 'development' | 'production' | 'staging';

export const PLATFORM_ENVIRONMENT: CurrentEnvironment =
  (process.env.PLATFORM_ENVIRONMENT as CurrentEnvironment) || 'development';

const common = {
  PORT: process.env.PORT || 8585,
};

const config = {
  development: {
    MONGODB_URI: 'mongodb://localhost:27017/db-ba-enterprise-local',
  },
  staging: {
    MONGODB_URI: `${process.env.MONGODB_URI}/db-linken-sphere-staging?tls=true&authSource=admin&retryWrites=true&w=majority`,
  },
  production: {
    MONGODB_URI: `${process.env.MONGODB_URI}/db-linken-sphere-production?tls=true&authSource=admin&retryWrites=true&w=majority`,
  },
};
export const GLOBAL_CONFIG = merge(common, config[PLATFORM_ENVIRONMENT]);
