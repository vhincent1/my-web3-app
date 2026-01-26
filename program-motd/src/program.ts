import appConfig from '../app.config.ts';
import express from 'express';

import { MotdProgram } from '../lib/instructions.ts';

const router = express.Router();

const program = new MotdProgram(appConfig.CONNECTION, appConfig.PROGRAM_ID);

router.get('/', async (req, res) => {
  const state = await program.update();
  console.log('Current:', state);
  res.render('program', { program });
});

router.post('/message', async (req, res) => {
  const { variant, userInput } = req.body;
  console.log('Received data:', variant, userInput, userInput.length);

  const validate = program.validateMessage(variant, userInput);
  if (!validate.valid) return res.status(400).render('program', { program, status: 'Error: ' + validate.error });

  const result = await program.submitMessage(appConfig.ADMIN_WALLET.keypair, variant, userInput);
  await program.update();
  res.status(200).render('program', { program, status: result.status });
});

type CallbackFunction = (message: string) => void;
function delayMessage(message: string, callback: CallbackFunction) {}
const im = (o: string) => (req, res) => {
  console.log(o);
  res.send('Hi');
};

router.get('/a', im('ooo'));

export default router;
