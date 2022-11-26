import { testRoot, singleTestMatch, unitTestsFolderName } from './constants.mjs';
import { baseConfig } from './jest.config.mjs';

const unitConfig = {
  ...baseConfig,
  testMatch: [
    `${testRoot}/${unitTestsFolderName}/**/${singleTestMatch}`,
  ],
};

export default unitConfig;
