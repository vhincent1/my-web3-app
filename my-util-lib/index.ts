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

const parseArgs = (args, options) => {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      // Handle Double Dash (--flag)
      const key = arg.substring(2);
      const nextValue = args[i + 1];
      if (nextValue && !nextValue.startsWith('-')) {
        flags[key] = nextValue;
        i++;
      } else flags[key] = true;
    } else if (arg.startsWith('-')) {
      // Handle Single Dash (-f or -abc)
      const chars = arg.substring(1);
      // If it's a single char, it can take a value: -p 8080
      if (chars.length === 1) {
        const nextValue = args[i + 1];
        if (nextValue && !nextValue.startsWith('-')) {
          flags[chars] = nextValue;
          i++;
        } else flags[chars] = true;
      }
      // If it's multiple chars, treat as a cluster: -abc => a:true, b:true, c:true
      else for (const char of chars) flags[char] = true;
    } else positionals.push(arg);
  }
  if (options) {
    // 1. Get the list of allowed keys
    const allowedKeys = Object.keys(options);
    const unrecognized = Object.keys(flags).filter((key) => !allowedKeys.includes(key) && key !== 'help' && key !== 'h');
    if (unrecognized.length > 0) {
      console.error(`Error: Unrecognized flags: ${unrecognized.map((k) => `-${k.length > 1 ? '-' : ''}${k}`).join(', ')}`);
      process.exit(0);
    }
  }
  return { flags, positionals };
};

import { keypairUtils } from './solanaUtils.ts';

export { keypairUtils, checkField, parseArgs };
