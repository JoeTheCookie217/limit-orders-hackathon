import React from "react";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./index.scss";

interface TxToastProps {
  title: string;
  txId: string;
  isEthereum?: boolean;
}

const buildExplorerLink = (txId: string, isEthereum = false): string => {
  if (isEthereum) {
    return `https://etherscan.io/tx/${txId}`;
  }
  // Massa explorer links based on network
  const network = import.meta.env.VITE_NETWORK_NAME || "buildnet";
  if (network === "mainnet") {
    return `https://explorer.massa.net/operation/${txId}`;
  }
  return `https://massexplo.massahub.network/tx/${txId}`;
};

const TxToast: React.FC<TxToastProps> = ({
  title,
  txId,
  isEthereum = false,
}) => {
  const explorerUrl = buildExplorerLink(txId, isEthereum);

  return (
    <div className="tx-toast">
      <span className="tx-toast__title">{title}</span>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="tx-toast__link"
      >
        View on Explorer
        <FontAwesomeIcon icon={faExternalLinkAlt} />
      </a>
    </div>
  );
};

export default TxToast;
