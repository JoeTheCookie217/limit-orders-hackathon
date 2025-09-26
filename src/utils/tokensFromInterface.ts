import {
  WMAS as _WMAS,
  USDC as _USDC,
  DAI as _DAI,
  WETH as _WETH,
  WETH_B as _WETH_B,
  USDT as _USDT,
  WBTC as _WBTC,
} from "@dusalabs/sdk";
import { CHAIN_ID, FEATURE_FLAGS, IS_BUILDNET, tokenSC } from "./config";
import { DUSA_LOCKED_TOKENS_MASSA } from "./configSale";
import { Token } from "./types";
import charlie from "../assets/img/charlie.png";
import dusa_mid_transp from "../assets/img/dusa_mid_transp.png";
import dusa from "../assets/img/dusa_transp.png";
import fpom from "../assets/img/fpom.jpg";
import jelly from "../assets/img/jelly_small.png";
import Massa_Brand_Red from "../assets/img/Massa_Brand_Red.svg";
import Massa_Brand_White from "../assets/img/Massa_Brand_White.svg";
import pom from "../assets/img/pom.png";
import roll from "../assets/img/roll.svg";

const wmas = _WMAS[CHAIN_ID];
const equals = wmas.equals;

export const MASSA: Token = new Token(
  CHAIN_ID,
  wmas.address + "_",
  wmas.decimals,
  Massa_Brand_Red,
  "MAS",
  "Massa",
);

// airdrop
const jellyAddress = IS_BUILDNET
  ? "AS1fSJMwRMhwZW7vndDjARo47r3zHdAUMRiNh617pyN15YR1ddgu"
  : "AS1kVpmFjPeyamyBJ77x24M2r764hd651kEZ9GjiR6uZbEQTqdrk"; // mainnet
export const JELLY: Token = new Token(
  CHAIN_ID,
  jellyAddress,
  18,
  jelly,
  "JELLY",
  "Jelly Token",
);
// governance v2
const dusaMainAddress = IS_BUILDNET
  ? "AS12WBfwEXfV5WQ41cBcwL6EzDZgWt7QdaBQ6ENoshXigKLJrJ7WS"
  : tokenSC;
export const DUSA_MAIN: Token = new Token(
  CHAIN_ID,
  dusaMainAddress,
  18,
  dusa,
  "DUSA",
  "Dusa Token",
);

export const DUSA_LOCKED_SEED = new Token(
  CHAIN_ID,
  DUSA_LOCKED_TOKENS_MASSA[0],
  18,
  dusa_mid_transp,
  "DUSAL",
  "Dusa Locked Seed",
);
export const DUSA_LOCKED_PUBLIC_1 = new Token(
  CHAIN_ID,
  DUSA_LOCKED_TOKENS_MASSA[1],
  18,
  dusa_mid_transp,
  "DUSAL",
  "Dusa Locked Public 1",
);
export const DUSA_LOCKED_PUBLIC_2 = new Token(
  CHAIN_ID,
  DUSA_LOCKED_TOKENS_MASSA[2],
  18,
  dusa_mid_transp,
  "DUSAL",
  "Dusa Locked Public 2",
);

export const ntDUSA: Token = new Token(
  CHAIN_ID,
  "AS12htBPHaA9o6rN8khciuNZVmpquTEruWkCAxMkCeRYMbYd4UFL6",
  18,
  dusa,
  "NTD",
  "NT-DUSA",
);

export const PUR: Token = new Token(
  CHAIN_ID,
  "AS133eqPPaPttJ6hJnk3sfoG5cjFFqBDi1VGxdo2wzWkq8AfZnan",
  18,
  charlie,
  "PUR",
  "Purrfect Universe",
);
export const POM: Token = new Token(
  CHAIN_ID,
  "AS1nqHKXpnFXqhDExTskXmBbbVpVpUbCQVtNSXLCqUDSUXihdWRq",
  18,
  pom,
  "POM",
  "Pepe On Massa",
);
export const FPOM: Token = new Token(
  CHAIN_ID,
  "AS12GDtiLRQELN8e6cYsCiAGLqdogk59Z9HdhHRsMSueDA8qYyhib",
  18,
  fpom,
  "FPOM",
  "Fake Pepe on Massa",
);
export const ROLL: Token = new Token(
  CHAIN_ID,
  "AS111111111111111111111Awmv8x",
  9,
  roll,
  "ROLL",
  "Roll",
);

export const tokens: Token[] = [
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ...wmas,
    logoURI: Massa_Brand_White,
    equals,
  },
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
    symbol: IS_BUILDNET ? "WBTC.s" : "WBTC.e",
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._WETH[CHAIN_ID],
    name: _WETH[CHAIN_ID].name + " (Ethereum)",
    logoURI:
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    equals,
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    ..._WETH_B[CHAIN_ID],
    name: _WETH_B[CHAIN_ID].name + " (BSC)",
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
];
// eslint-enable @typescript-eslint/ban-ts-comment
!IS_BUILDNET && tokens.push(PUR);
!IS_BUILDNET && tokens.push(POM);
!IS_BUILDNET && tokens.push(FPOM);
// FEATURE_FLAGS.POINTS_V2 && tokens.push(JELLY);
tokens.push(DUSA_MAIN);
!IS_BUILDNET && tokens.push(ntDUSA);

export const WMAS = tokens[0];
export const USDC = tokens[1];
export const DAI = tokens[2];
export const WBTC = tokens[3];
export const WETH = tokens[4];
export const WETH_B = tokens[5];
export const USDT = tokens[6];

export const tags = ["meme", "stable", "popular", "defi"] as const;
type Tag = (typeof tags)[number];
export const tokenToTags: Record<string, Tag[]> = {
  [DUSA_MAIN.address]: ["defi"],
  [WMAS.address]: ["popular"],
  [USDC.address]: ["stable", "popular"],
  [DAI.address]: ["stable"],
  [USDT.address]: ["stable"],
  [WBTC.address]: ["popular"],
  [WETH.address]: ["popular"],
  [PUR.address]: ["meme"],
  [POM.address]: ["meme"],
  [FPOM.address]: ["meme"],
};
