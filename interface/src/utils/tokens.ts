import {
  WMAS as _WMAS,
  USDC as _USDC,
  DAI as _DAI,
  WETH as _WETH,
  WETH_B as _WETH_B,
  USDT as _USDT,
  WBTC as _WBTC,
} from "@dusalabs/sdk";
import { CHAIN_ID } from "./config";
import { Token } from "./types";
import dusa from "../assets/img/dusa_transp.png";
import Massa_Brand_Red from "../assets/img/Massa_Brand_Red.svg";
import Massa_Brand_White from "../assets/img/Massa_Brand_White.svg";

const wmas = _WMAS[CHAIN_ID];
const equals = wmas?.equals;

export const MASSA: Token = new Token(
  CHAIN_ID,
  wmas?.address + "_",
  wmas?.decimals || 9,
  Massa_Brand_Red,
  "MAS",
  "Massa",
);

export const WMAS: Token = new Token(
  CHAIN_ID,
  wmas?.address,
  wmas?.decimals || 9,
  Massa_Brand_White,
  "WMAS",
  "Wrapped Massa",
);

// governance v2 - buildnet
export const DUSA_MAIN: Token = new Token(
  CHAIN_ID,
  "AS12WBfwEXfV5WQ41cBcwL6EzDZgWt7QdaBQ6ENoshXigKLJrJ7WS", // Buildnet address
  18,
  dusa,
  "DUSA",
  "Dusa Token",
);

// Create tokens list - exact same structure as tokensFromInterface.ts
export const tokens: Token[] = [
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._USDC[CHAIN_ID],
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    equals,
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._DAI[CHAIN_ID],
    logoURI:
      "https://s3.coinmarketcap.com/static-gravity/image/47f58ac1aa854d448df91ea0e6fbfe6f.png",
    equals,
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._WBTC[CHAIN_ID],
    logoURI:
      "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400",
    equals,
    symbol: "WBTC.s",
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._WETH[CHAIN_ID],
    name: (_WETH[CHAIN_ID]?.name || "WETH") + " (Ethereum)",
    logoURI:
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    equals,
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._WETH_B[CHAIN_ID],
    name: (_WETH_B[CHAIN_ID]?.name || "WETH") + " (BSC)",
    logoURI:
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    equals,
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._USDT[CHAIN_ID],
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
    equals,
  },
  MASSA,
  DUSA_MAIN,
];

export const USDC = tokens[0];
export const DAI = tokens[1];
export const WBTC = tokens[2];
export const WETH = tokens[3];
export const WETH_B = tokens[4];
export const USDT = tokens[5];
// WMAS removed from token list - using MAS directly

export const tags = ["native", "stable", "popular", "defi"] as const;
type Tag = (typeof tags)[number];

export const tokenToTags: Record<string, Tag[]> = {};

// Add tags safely - buildnet only
if (MASSA?.address) tokenToTags[MASSA.address] = ["native", "popular"];
if (DUSA_MAIN?.address) tokenToTags[DUSA_MAIN.address] = ["defi"];
// WMAS removed - using MAS directly
if (USDC?.address) tokenToTags[USDC.address] = ["stable", "popular"];
if (DAI?.address) tokenToTags[DAI.address] = ["stable"];
if (USDT?.address) tokenToTags[USDT.address] = ["stable"];
if (WBTC?.address) tokenToTags[WBTC.address] = ["popular"];
if (WETH?.address) tokenToTags[WETH.address] = ["popular"];

// Helper functions
export const isNativeToken = (token: Token): boolean => {
  return token.equals(MASSA);
};

export const isWrappedToken = (token: Token): boolean => {
  return WMAS ? token.equals(WMAS) : false;
};

// Common token list for buildnet - filter out undefined tokens
export const COMMON_TOKENS: Token[] = [MASSA, USDC, DUSA_MAIN].filter(
  Boolean,
) as Token[];
