import { NATIVE_ADDRESS } from "../addresses.js";
import { type ChainId, ChainUtils } from "../chain.js";
import { MathLib, type RoundingDirection } from "../math/index.js";
import type { Address, BigIntish } from "../types.js";
import type { Eip5267Domain } from "./Eip5267Domain.js";

export interface IToken {
  address: Address;
  name?: string;
  symbol?: string;
  decimals?: BigIntish;
  price?: BigIntish;
  eip5267Domain?: Eip5267Domain;
}

export class Token implements IToken {
  static native(chainId: ChainId) {
    const currency = ChainUtils.CHAIN_METADATA[chainId].nativeCurrency;

    return new Token({ ...currency, address: NATIVE_ADDRESS });
  }

  /**
   * The token's address.
   */
  public readonly address: Address;

  /**
   * The token's name.
   */
  public readonly name?: string;

  /**
   * The token's symbol.
   */
  public readonly symbol?: string;

  /**
   * The token's number of decimals. Defaults to 0.
   */
  public readonly decimals: number;

  /**
   * The eip712 domain of the token if it can be directly queried onchain
   */
  public readonly eip5267Domain?: Eip5267Domain;

  /**
   * Price of the token in USD (scaled by WAD).
   */
  public price?: bigint;

  constructor({
    address,
    name,
    symbol,
    decimals = 0,
    price,
    eip5267Domain,
  }: IToken) {
    this.address = address;
    this.name = name;
    this.symbol = symbol;
    this.decimals = Number(decimals);
    this.eip5267Domain = eip5267Domain;

    if (price != null) this.price = BigInt(price);
  }

  /**
   * Quotes an amount in USD (scaled by WAD) in this token.
   * Returns `undefined` iff the token's price is undefined.
   * @param amount The amount of USD to quote.
   */
  fromUsd(amount: bigint, rounding: RoundingDirection = "Down") {
    if (this.price == null) return;

    return MathLib.mulDiv(
      amount,
      10n ** BigInt(this.decimals),
      this.price,
      rounding,
    );
  }

  /**
   * Quotes an amount of tokens in USD (scaled by WAD).
   * Returns `undefined` iff the token's price is undefined.
   * @param amount The amount of tokens to quote.
   */
  toUsd(amount: bigint, rounding: RoundingDirection = "Down") {
    if (this.price == null) return;

    return MathLib.mulDiv(
      amount,
      this.price,
      10n ** BigInt(this.decimals),
      rounding,
    );
  }
}
