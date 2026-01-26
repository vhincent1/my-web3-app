# to build
agave-install init stable
cargo build-sbf

# to deploy
agave-install init 2.2.9
solana airdrop 1
solana program deploy target/deploy/motd.so --program-id ../config/program-keypair.json