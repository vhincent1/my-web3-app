import fs from 'node:fs';
import path from 'node:path';

//program controller
export interface ProgramEntry {
  name: string;
  alias: string;
  program: any;
  ejs: {
    fileName: string;
    partialExists?: boolean;
    // variables?: any
  };
  apiRoutes?: any;
}

const programs = [];

const addEntry = (entry: ProgramEntry) => {
  const __dirname = path.resolve();
  const partialPath = path.join(__dirname, 'views', 'programs', entry.ejs.fileName);
  entry.ejs.partialExists = fs.existsSync(partialPath);
  programs.push(entry);
  console.log('program entry:', entry.alias);
};

const findByAlias = (alias: string) => programs.find((entry) => entry.alias === alias);

import motd from './MOTD.ts';
addEntry(motd);

const programsController = { findByAlias, programs };

export { programsController };
