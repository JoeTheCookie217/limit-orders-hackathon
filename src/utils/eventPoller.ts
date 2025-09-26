import { EventPoller, type Provider } from "@massalabs/massa-web3";
import type { SCOutputEvent } from "@massalabs/massa-web3/dist/esm/generated/client-types";

interface IEventPollerResult {
  isError: boolean;
  events: SCOutputEvent[];
}

const MASSA_EXEC_ERROR = "massa_execution_error";

export const pollAsyncEvents = async (
  client: Provider,
  txId: string,
  noEventTx = false,
): Promise<IEventPollerResult> => {
  if (noEventTx) return { isError: false, events: [] };

  return new Promise((resolve, reject) => {
    const { stopPolling } = EventPoller.start(
      client,
      { operationId: txId },
      (events) => {
        const errorEvents = events.filter((e) =>
          e.data.includes(MASSA_EXEC_ERROR),
        );
        if (errorEvents.length > 0) {
          stopPolling();
          return resolve({ isError: true, events });
        }
        if (events.length > 0) {
          stopPolling();
          return resolve({ isError: false, events });
        }
        console.log("No events have been emitted during deployment");
      },
      (error) => {
        stopPolling();
        reject(error);
      },
      2000,
    );
  });
};
