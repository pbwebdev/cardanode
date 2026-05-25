// Entry point for the self-hosted Mesh SDK bundle.
// Only re-exports what the wallet connect + delegation flow needs —
// esbuild tree-shakes the rest of Mesh away.
export {
  BrowserWallet,
  MeshTxBuilder,
  KoiosProvider,
  BlockfrostProvider,
} from "@meshsdk/core";
