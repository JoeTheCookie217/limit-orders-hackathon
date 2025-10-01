import { useContext } from 'react';
import { IERC20 } from '@dusalabs/sdk';
import { useQuery } from '@tanstack/react-query';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { readOnlyClient } from '../utils/web3Client';

type FetchAllowanceProps = {
  tokenAddress: string | undefined;
  spenderAddress: string;
};

const useFetchAllowance = ({
  tokenAddress,
  spenderAddress,
}: FetchAllowanceProps) => {
  const { connectedAddress } = useContext(AccountWrapperContext);
  const allowanceQuery = useQuery(
    ['allowance', connectedAddress, tokenAddress, spenderAddress],
    () =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      new IERC20(tokenAddress!, readOnlyClient)
        .allowance(connectedAddress!, spenderAddress)
        .catch(() => 0n),
    { enabled: !!connectedAddress && !!tokenAddress },
  );

  return allowanceQuery;
};

export default useFetchAllowance;
