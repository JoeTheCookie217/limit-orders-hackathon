import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// @notice: allow JSON.stringify on objects containing BigInt
// must be defined at the root level

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
BigInt.prototype.toJSON = function (): string {
  return String(this);
};

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
