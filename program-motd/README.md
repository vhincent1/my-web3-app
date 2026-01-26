A 'Message Of The Day' Solana program, that stores a message in the program, and you can read/update the message

###### install: 
* [solana-cli](https://solana.com/docs/intro/installation)
* [agave-install](https://docs.anza.xyz/cli/install)

###### usage: 
1. change the values `adminKeypair`,`rpcEndpoint` in `app.config.ts`

2. generate an id for the program
`solana-keygen new -o config/program-keypair.json`

3. update the `program-id` in `program/Cargo.toml`

4. run a `solana-test-validator`

5. build & deploy
`yarn run program:build`
`yarn run program:deploy`

6. start the interactive web ui
`yarn run start`

also test the program `yarn run jest`