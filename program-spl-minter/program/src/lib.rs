use borsh::{ BorshDeserialize, BorshSerialize };

use solana_program::{
    account_info::{ next_account_info, AccountInfo },
    entrypoint,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    msg,
    program::{ invoke_signed },
};
use mpl_token_metadata::instructions::{ CreateV1CpiBuilder };
use mpl_token_metadata::types::{ TokenStandard };

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CreateMetadataArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8]
) -> ProgramResult {
    // 1. Decode the dynamic metadata arguments
    let args = CreateMetadataArgs::try_from_slice(instruction_data)?;

    let account_info_iter = &mut accounts.iter();
    // Accounts required for Metaplex Metadata
    let metadata_account = next_account_info(account_info_iter)?; // PDA: ["metadata", program_id, mint_key]
    let mint = next_account_info(account_info_iter)?;
    let mint_authority = next_account_info(account_info_iter)?; // Your Program PDA
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let sysvar_instructions = next_account_info(account_info_iter)?;
    let metadata_program = next_account_info(account_info_iter)?; // Metaplex Program ID

    // PDA seeds for your Mint Authority
    let (pda_pubkey, bump) = Pubkey::find_program_address(&[b"mint_authority"], program_id);
    let signer_seeds = &[b"mint_authority".as_ref(), &[bump]];

    msg!("Creating Metadata via Metaplex CPI...");

    // Using Metaplex's modern CpiBuilder (CreateV1)
    // CreateV1CpiBuilder::new(metadata_program)
    //     .metadata(metadata_account)
    //     .mint(mint, false)
    //     .authority(mint_authority)
    //     .payer(payer)
    //     .update_authority(mint_authority, true)
    //     .system_program(system_program)
    //     .sysvar_instructions(sysvar_instructions)
    //     .name("My Native Token".to_string())
    //     .symbol("MNT".to_string())
    //     .uri("https://arweave.net/metadata.json".to_string())
    //     .seller_fee_basis_points(0)
    //     .token_standard(TokenStandard::Fungible)
    //     .invoke_signed(&[signer_seeds])?;
    CreateV1CpiBuilder::new(metadata_program)
        .metadata(metadata_account)
        .mint(mint, false)
        .authority(mint_authority)
        .payer(payer)
        .update_authority(mint_authority, true)
        .name(args.name)
        .symbol(args.symbol)
        .uri(args.uri) // This is the link to your JSON
        .seller_fee_basis_points(0)
        .token_standard(TokenStandard::Fungible)
        .invoke_signed(&[signer_seeds])?;

    msg!("Metadata created successfully!");
    Ok(())
}
