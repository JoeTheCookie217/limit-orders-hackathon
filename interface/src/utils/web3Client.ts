import { Account, Web3Provider } from "@massalabs/massa-web3";
import { CHAIN_URL } from "./config";

// Create a dedicated keypair for read-only operations (like Dusa)
export const baseKeyPair = await Account.generate();

// Create JSON-RPC client for read operations
export const readOnlyClient = Web3Provider.fromRPCUrl(CHAIN_URL, baseKeyPair);
