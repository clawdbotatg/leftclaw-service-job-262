import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  8453: {
    CLAWD: {
      address: "0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07",
      abi: [
        { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
        { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
        { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
        {
          type: "function",
          name: "totalSupply",
          inputs: [],
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "balanceOf",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "allowance",
          inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
          ],
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "approve",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "transferFrom",
          inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "burn",
          inputs: [{ name: "amount", type: "uint256" }],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "burnFrom",
          inputs: [
            { name: "account", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "event",
          name: "Transfer",
          inputs: [
            { name: "from", type: "address", indexed: true },
            { name: "to", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
          ],
        },
        {
          type: "event",
          name: "Approval",
          inputs: [
            { name: "owner", type: "address", indexed: true },
            { name: "spender", type: "address", indexed: true },
            { name: "value", type: "uint256", indexed: false },
          ],
        },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
