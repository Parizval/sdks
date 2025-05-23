import type { PartialApiToken } from "@morpho-org/blue-api-sdk";
import type { MarketId } from "@morpho-org/blue-sdk";
import { fetchAccrualPosition } from "@morpho-org/blue-sdk-viem";
import { Time } from "@morpho-org/morpho-ts";
import type { Account, Chain, Client, Transport } from "viem";
import { apiSdk } from "../api";
import { authorizationLogs, preLiquidationLogs } from "./logGetters";
import { type PreLiquidation, PreLiquidationPosition } from "./types";

export async function getPreLiquidablePositions(
  client: Client<Transport, Chain, Account>,
  whitelistedMarkets: MarketId[],
) {
  const chainId = client.chain.id;

  const preLiquidations = (await preLiquidationLogs(client)).filter(
    (preLiquidation) => whitelistedMarkets.includes(preLiquidation.marketId),
  );

  const preLiquidationInstances = await Promise.all(
    preLiquidations.map(async (preLiquidation) => {
      const {
        markets: { items: market },
      } = await apiSdk.getMarketAssets({
        chainId,
        marketId: preLiquidation.marketId,
      });

      const loanAsset = market !== null ? market[0]?.loanAsset : undefined;
      const collateralAsset =
        market !== null ? market[0]?.collateralAsset : undefined;

      if (
        loanAsset === undefined ||
        collateralAsset === undefined ||
        collateralAsset === null
      )
        return;

      return {
        preLiquidation,
        borrowers: await authorizationLogs(client, preLiquidation),
        loanAsset,
        collateralAsset,
      };
    }),
  );

  const preLiquidablePositions = await Promise.all(
    preLiquidationInstances
      .filter((position) => position !== undefined)
      .map(async (preLiquidationPosition) => {
        return await Promise.all(
          preLiquidationPosition.borrowers.map(async (borrower) => {
            return await getPreLiquidablePosition(
              client,
              preLiquidationPosition.preLiquidation,
              borrower,
              preLiquidationPosition.collateralAsset,
              preLiquidationPosition.loanAsset,
            );
          }),
        );
      }),
  );

  return preLiquidablePositions
    .flat()
    .filter((position) => position.preSeizableCollateral !== undefined);
}

async function getPreLiquidablePosition(
  client: Client<Transport, Chain>,
  preLiquidation: PreLiquidation,
  borrower: string,
  collateralAsset: PartialApiToken,
  loanAsset: PartialApiToken,
) {
  const chainId = client.chain.id;
  const accrualPosition = await fetchAccrualPosition(
    borrower as `0x${string}`,
    String(preLiquidation.marketId) as MarketId,
    client,
    { chainId },
  );

  const accruedPosition = accrualPosition.accrueInterest(Time.timestamp());

  return new PreLiquidationPosition(
    accruedPosition,
    collateralAsset,
    loanAsset,
    preLiquidation,
  );
}
