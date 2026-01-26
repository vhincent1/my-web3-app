import appConfig from '../app.config.ts';
import app from '../src/app.ts';

// import { keypairUtils, parseArgs } from '../src/utils.ts';
import {keypairUtils, parseArgs } from '@my-util-lib/utils'

const startServer = () =>
  app.listen(appConfig.PORT, () => {
    console.log(`Server listening at http://localhost:${appConfig.PORT}`);
  });

const run = async () => {
  const options: any = {
    admin_key: { type: 'string', desc: 'keypair file', default: appConfig.ADMIN_WALLET.filePath },
    program_key: { type: 'string', desc: 'keypair file', default: appConfig.PROGRAM_WALLET.filePath },
    port: { alias: 'p', type: 'number', desc: 'client port', default: `${appConfig.PORT}` },
  };

  const printHelp = () => {
    console.log('Usage: yarn run start [options]');
    const helpLine = Object.entries(options)
      .map(([key, val]: any) => {
        console.log(`Flag: --${key}${val.alias ? ', -' + val.alias : ''} <${val.type}> (${val.desc})`);
        return `--${key} ${val.abrv ? `-${val.abrv}` : ''}<${val.type}>`;
      })
      .join(' ');
    // console.log(helpLine);
    process.exit(0);
  };

  const args = process.argv.slice(2);
  const { flags, positionals }: any = parseArgs(args, options);

  if (['help', 'h'].some((key) => key in flags)) printHelp();
  if (args.length > 0) console.log('flags:', flags);

  try {
    if (flags.port || flags.p) appConfig.PORT = parseInt(flags.port || flags.p) ?? appConfig.PORT;
    if (flags.admin_key) appConfig.ADMIN_WALLET = keypairUtils.load(flags.admin_key, true);
    if (flags.program_key) appConfig.PROGRAM_WALLET = keypairUtils.load(flags.program_key, true);

    console.log('');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Admin address:', appConfig.ADMIN_WALLET.keypair.publicKey.toBase58());
    console.log('Program address:', appConfig.PROGRAM_ID.toBase58());
    console.log(`RPC Endpoint: ${appConfig.CONNECTION.rpcEndpoint}`);
    console.log('');

    startServer();
  } catch (err) {
    console.log('Invalid arguments:', err.message);
    printHelp();
  }
};

run();
