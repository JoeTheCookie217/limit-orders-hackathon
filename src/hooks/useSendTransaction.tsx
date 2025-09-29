import React, { useState, useContext } from 'react';
import type { Provider } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { NETWORK } from 'utils/config';
import eventEmitter from "utils/eventEmitter";
import { pollAsyncEvents } from "utils/eventPoller";
import { addRecentTransaction, type RecentTransaction } from 'utils/storage';
import type { ICallData } from 'utils/types';

interface ExecuteSCData {
  byteCode: Uint8Array;
  datastore: Map<Uint8Array, Uint8Array>;
}

interface SendTransactionProps {
  data?: ICallData | ExecuteSCData;
  onTxConfirmed?: () => void;
  execute?: boolean;
  skipAutoRefetch?: boolean;
}

interface UseSendTransactionReturn {
  txHash: string | undefined;
  txError: string | undefined;
  txEvents: string[] | undefined;
  success: boolean;
  pending: boolean;
  submitTx: (data?: ICallData) => Promise<void>;
}

const generateTransactionDescription = (data: ICallData): string => {
  const { targetFunction } = data;

  switch (targetFunction) {
    case 'addLimitOrder':
    case 'addLimitOrderMas':
      return 'Create limit order';
    case 'cancelOrder':
    case 'cancelOrderMas':
      return 'Cancel limit order';
    case 'claimOrder':
    case 'claimOrderMas':
      return 'Claim order tokens';
    case 'increaseAllowance':
      return 'Approve token spending';
    case 'transfer':
      return 'Transfer tokens';
    default:
      return 'Transaction';
  }
};

export const useSendTransaction = (
  props: SendTransactionProps,
): UseSendTransactionReturn => {
  const [txHash, setTxHash] = useState<string>();
  const [txError, setTxError] = useState<string>();
  const [txEvents, setTxEvents] = useState<string[]>();
  const [success, setSuccess] = useState(false);
  const [isTxPending, setIsTxPending] = useState(false);
  const [isConfirmPending, setIsConfirmPending] = useState(false);
  const pending = isTxPending || isConfirmPending;

  const {
    client,
    connectedAddress: signerAddress,
    selectedProvider,
    refetch,
  } = useContext(AccountWrapperContext);

  const submitTx = async (_data?: ICallData) => {
    if (!client || !signerAddress) {
      console.error('Please connect your wallet first');
      return;
    }

    const data = _data || props.data;
    if (!data || !('targetAddress' in data)) {
      console.error('Invalid transaction data');
      return;
    }

    setIsConfirmPending(true);
    setTxError(undefined);
    setSuccess(false);

    try {
      // Verify network
      if (selectedProvider) {
        const networkInfo = await selectedProvider.networkInfos();
        if (networkInfo.name !== NETWORK) {
          const errorMsg = `Wrong network detected (${networkInfo.name}). Please switch your wallet to ${NETWORK} to submit transactions.`;
          console.error(errorMsg);
          toast.error(
            <div>
              <div style={{ fontWeight: 'bold' }}>Network Error</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {errorMsg}
              </div>
            </div>,
            { autoClose: 5000 }
          );
          setIsConfirmPending(false);
          return;
        }
      }

      console.log('Submitting transaction:', {
        target: data.targetAddress,
        function: data.targetFunction,
        value: (data.coins || 0n).toString(),
      });

      setIsTxPending(true);
      setIsConfirmPending(false);

      // Create transaction operation
      const operation = await client.callSC({
        target: data.targetAddress,
        func: data.targetFunction,
        parameter: data.parameter,
        coins: data.coins || 0n,
      });

      const operationId = operation.id;
      setTxHash(operationId);

      // Generate transaction description
      const description = generateTransactionDescription(data);

      // Add to recent transactions
      const recentTx: RecentTransaction = {
        hash: operationId,
        description,
        timestamp: Date.now(),
        status: 'pending',
      };
      addRecentTransaction(recentTx);

      // Show pending toast
      toast.info(
        <div>
          <div>{description}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Waiting for confirmation...
          </div>
        </div>,
        {
          autoClose: false,
          toastId: operationId,
        },
      );

      // Poll for events
      try {
        const eventResult = await pollAsyncEvents(client, operationId);

        if (eventResult.isError) {
          throw new Error('Transaction failed during execution');
        }

        const eventStrings = eventResult.events.map((e) => e.data);
        setTxEvents(eventStrings);
        setSuccess(true);
        setTxError(undefined);

        // Update recent transaction status
        const successTx: RecentTransaction = {
          hash: operationId,
          description,
          timestamp: Date.now(),
          status: 'confirmed',
        };
        addRecentTransaction(successTx);

        // Dismiss pending toast and show success
        toast.dismiss(operationId);
        toast.success(
          <div>
            <div>{description}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Transaction confirmed
            </div>
          </div>,
        );

        // Execute callback
        if (props.onTxConfirmed) {
          props.onTxConfirmed();
        }

        // Auto-refetch data unless skipped
        if (!props.skipAutoRefetch) {
          setTimeout(() => {
            refetch(['balances', 'orders']);
            eventEmitter.emit('transactionConfirmed', {
              hash: operationId,
              events: eventStrings,
            });
          }, 1000);
        }
      } catch (confirmError) {
        const errorMessage =
          confirmError instanceof Error
            ? confirmError.message
            : 'Transaction confirmation failed';

        setTxError(errorMessage);
        setSuccess(false);

        // Update recent transaction status
        const failedTx: RecentTransaction = {
          hash: operationId,
          description,
          timestamp: Date.now(),
          status: 'failed',
        };
        addRecentTransaction(failedTx);

        // Dismiss pending toast and show error
        toast.dismiss(operationId);
        toast.error(
          <div>
            <div>{description}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{errorMessage}</div>
          </div>,
        );

        console.error('Transaction confirmation error:', confirmError);
      }
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit transaction';

      setTxError(errorMessage);
      setSuccess(false);

      toast.error(`Transaction failed: ${errorMessage}`);
      console.error('Transaction submit error:', submitError);
    } finally {
      setIsTxPending(false);
      setIsConfirmPending(false);
    }
  };

  return {
    txHash,
    txError,
    txEvents,
    success,
    pending,
    submitTx,
  };
};
