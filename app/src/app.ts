import path from 'path';
import express from 'express';
import app from './index.ts';
import { programsController } from './controllers/programs/index.controller.ts';
import { MotdProgram } from '@my-web3-app/motd/lib/instructions.ts';

//initialize programs
programsController.programs.forEach((entry) => {
  if (entry.program instanceof MotdProgram) {
    entry.program.initialize();
  }
});

// express app

const port = 3000;
const __dirname = path.resolve();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Serve static files (like your frontend script)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
