import fs from 'fs/promises';
import path from 'path';

// prettier-ignore
const pathExists = (filePath) => fs.access(filePath).then(() => true).catch(() => false);

//sync version
// const pathExists = (filePath) => fs.existsSync(filePath);

const checkField = (value: any, name: string) => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    throw Error(`${name} is empty`);
  } else if (typeof value === 'number' || value < 0) {
    throw Error(`${name} is negative`);
  }
};

import { keypairUtils } from './solanaUtils.ts';

export { keypairUtils, checkField };
