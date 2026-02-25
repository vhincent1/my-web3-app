import appConfig, { OWNER_KEYPAIR_PATH } from '../app.config.ts';

import { keypairUtils } from '../../my-util-lib/src/solana.ts';

const [KEYPAIR_OWNER, KEYPAIR_TREASURY] = [OWNER_KEYPAIR_PATH, './config/treasury-keypair.json'].map((f) => keypairUtils.loadKeypair(f));


