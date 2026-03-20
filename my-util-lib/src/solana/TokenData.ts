import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';
import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata';

interface TokenInfo {
  // address: string;
  name: string;
  symbol: string;
  icon: string;
  // usdPrice: number;
}

const getTokenInfo = async (tokenAddresses: string | string[]): Promise<Record<string, TokenInfo>> => {
  // const map = getFromJupiter(query);
  const map = getFromMetaplex(tokenAddresses);
  return map;
};

const getFromJupiter = async (addresses: string | string[]) => {
  const JUP_API_KEY = '';
  const query = Array.isArray(addresses) ? addresses.join(',') : addresses;

  const response = await fetch(`https://api.jup.ag/tokens/v2/search?query=${query}`, { headers: { 'x-api-key': JUP_API_KEY } }).then((r) => r.json());

  return Object.fromEntries(
    response.map((token: any) => [
      token.id,
      {
        name: token.name,
        symbol: token.symbol,
        icon: token.icon,
        // usdPrice: token.usdPrice,
      },
    ]),
  );
};

async function getFromMetaplex(mintAddress: string | string[], rpcEndpoint = 'https://api.mainnet-beta.solana.com'): Promise<Record<string, TokenInfo>> {
  
  const umi = createUmi(rpcEndpoint);

  const addresses = Array.isArray(mintAddress) ? mintAddress : [mintAddress];
  const results: Record<string, TokenInfo> = {};

  async function getToken(address: string) {
    try {
      const mintPublicKey = publicKey(address);
      const asset = await fetchDigitalAsset(umi, mintPublicKey);

      const response = await fetch(asset.metadata.uri);
      if (!response.ok) throw new Error(`Failed to fetch JSON from URI: ${response.statusText}`);

      const metadataJson = await response.json();
      const iconUri = metadataJson.image;

      return {
        name: asset.metadata.name,
        symbol: asset.metadata.symbol,
        icon: iconUri,
      };
    } catch (error) {
      // console.error(`Error fetching token data for ${address}:`, error);
      return {
        name: 'Unknown',
        symbol: 'UNK',
        icon: '',
      };
    }
  }

  for (const address of addresses) {
    const token = await getToken(address);
    if (token) results[address] = token;
  }

  return results;
}

const tokens = ['So11111111111111111111111111111111111111112', 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'];

const token = getTokenInfo(tokens);
console.log(await token);
