import { useEffect, useState } from "react";
import {
  subscribeNetworkProblem,
  type NetworkProblem,
} from "~/utils/networkStatus";

/** Current network problem ("offline" | "slow" | null), kept up to date. */
export const useNetworkProblem = (): NetworkProblem => {
  // null on the server render; the real value arrives once mounted.
  const [problem, setProblem] = useState<NetworkProblem>(null);
  useEffect(() => subscribeNetworkProblem(setProblem), []);
  return problem;
};
