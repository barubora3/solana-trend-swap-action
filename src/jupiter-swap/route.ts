import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
  actionSpecOpenApiPostRequestBody,
  actionsSpecOpenApiGetResponse,
  actionsSpecOpenApiPostResponse,
} from '../openapi';
import jupiterApi from '../../api/jupiter-api';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
} from '@solana/actions';

export const JUPITER_LOGO =
  'https://ucarecdn.com/09c80208-f27c-45dd-b716-75e1e55832c4/-/preview/1000x981/-/quality/smart/-/format/auto/';

const SWAP_AMOUNT_USD_OPTIONS = [1, 10, 100];
const DEFAULT_SWAP_AMOUNT_USD = 10;
const US_DOLLAR_FORMATTING = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const SITE_URL = 'https://5ea2f724ac0f.ngrok.app';

const app = new OpenAPIHono();

app.openapi(
  createRoute({
    method: 'get',
    // path: '/{token}/{iconUrl}/{percentageIncrease}/{priceIncrease}',
    // path: '/{token}/{percentageIncrease}/{priceIncrease}',
    path: '/{id}',
    tags: ['Jupiter Swap'],
    request: {
      params: z.object({
        id: z.string(),
        // token: z.string(),
        // iconUrl: z.string().url(),
        // percentageIncrease: z.string(),
        // priceIncrease: z.string(),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    // const tokenPair = c.req.param('tokenPair');

    // const { token, iconUrl, percentageIncrease, priceIncrease } = c.req.param();
    // const { token, percentageIncrease, priceIncrease } = c.req.param();
    const { id } = c.req.param();
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' +
        id,
    );
    const tokenInfo = await res.json();
    const token = tokenInfo[0].symbol.toUpperCase();

    // console.log({ token, percentageIncrease, priceIncrease });
    const inputToken = 'USDC';
    const tokenPair = `${inputToken}-${token}`;

    const [inputTokenMeta, outputTokenMeta] = await Promise.all([
      jupiterApi.lookupToken(inputToken),
      jupiterApi.lookupToken(token),
    ]);

    const tokenIconUrl = tokenInfo[0].image;
    // console.log(imageUrl);
    const percentageIncrease =
      tokenInfo[0].price_change_percentage_24h.toFixed(2);
    // const priceIncrease = (
    //   tokenInfo[0].current_price - tokenInfo[0].low_24h
    // ).toFixed(6);
    // priceIncreaseだけどシンプルに価格を指定
    const priceIncrease = tokenInfo[0].current_price;
    const imageUrl = `${SITE_URL}/api/generate-image?symbol=${token}&iconUrl=${encodeURIComponent(tokenIconUrl)}&percentageIncrease=${percentageIncrease}&priceIncrease=${priceIncrease}`;

    if (!inputTokenMeta || !outputTokenMeta) {
      return c.json(
        {
          icon: imageUrl,
          label: 'Not Available',
          title: `Swap ${token} and SOL`,
          description: `Swap between ${token} and SOL.`,
          disabled: true,
          error: {
            message: `Token metadata not found.`,
          },
        } satisfies ActionGetResponse,
        404,
      );
    }

    const response: ActionGetResponse = {
      icon: imageUrl,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol}`,
      description: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}. Choose a USD amount of ${inputTokenMeta.symbol} from the options below, or enter a custom amount.`,
      links: {
        actions: [
          ...SWAP_AMOUNT_USD_OPTIONS.map((amount) => ({
            label: `${US_DOLLAR_FORMATTING.format(amount)}`,
            href: `/api/jupiter/swap/${tokenPair}/${amount}`,
          })),
          {
            href: `/api/jupiter/swap/${tokenPair}/{amount}`,
            label: `Buy ${outputTokenMeta.symbol}`,
            parameters: [
              {
                name: 'amount',
                label: 'Enter a custom USD amount',
              },
            ],
          },
        ],
      },
    };

    return c.json(response);
  },
);

app.openapi(
  createRoute({
    method: 'get',
    path: '/{tokenPair}/{amount}',
    tags: ['Jupiter Swap'],
    request: {
      params: z.object({
        tokenPair: z.string().openapi({
          param: {
            name: 'tokenPair',
            in: 'path',
          },
          type: 'string',
          example: 'USDC-SOL',
        }),
        amount: z
          .string()
          .optional()
          .openapi({
            param: {
              name: 'amount',
              in: 'path',
              required: false,
            },
            type: 'number',
            example: '1',
          }),
      }),
    },
    responses: actionsSpecOpenApiGetResponse,
  }),
  async (c) => {
    const { tokenPair, amount } = c.req.param();
    const [inputToken, outputToken] = tokenPair.split('-');
    const [inputTokenMeta, outputTokenMeta] = await Promise.all([
      jupiterApi.lookupToken(inputToken),
      jupiterApi.lookupToken(outputToken),
    ]);

    if (!inputTokenMeta || !outputTokenMeta) {
      return c.json(
        {
          icon: JUPITER_LOGO,
          label: 'Not Available',
          title: `Buy ${outputToken}`,
          description: `Buy ${outputToken} with ${inputToken}.`,
          disabled: true,
          error: {
            message: `Token metadata not found.`,
          },
        } satisfies ActionGetResponse,
        404,
      );
    }

    const response: ActionGetResponse = {
      icon: JUPITER_LOGO,
      label: `Buy ${outputTokenMeta.symbol}`,
      title: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}`,
      description: `Buy ${outputTokenMeta.symbol} with ${inputTokenMeta.symbol}.`,
    };

    return c.json(response);
  },
);

app.openapi(
  createRoute({
    method: 'post',
    path: '/{tokenPair}/{amount}',
    tags: ['Jupiter Swap'],
    request: {
      params: z.object({
        tokenPair: z.string().openapi({
          param: {
            name: 'tokenPair',
            in: 'path',
          },
          type: 'string',
          example: 'USDC-SOL',
        }),
        amount: z
          .string()
          .optional()
          .openapi({
            param: {
              name: 'amount',
              in: 'path',
              required: false,
            },
            type: 'number',
            example: '1',
          }),
      }),
      body: actionSpecOpenApiPostRequestBody,
    },
    responses: actionsSpecOpenApiPostResponse,
  }),
  async (c) => {
    const { tokenPair, amount } = c.req.param();
    const { account } = (await c.req.json()) as ActionPostRequest;

    const [inputToken, outputToken] = tokenPair.split('-');
    const [inputTokenMeta, outputTokenMeta] = await Promise.all([
      jupiterApi.lookupToken(inputToken),
      jupiterApi.lookupToken(outputToken),
    ]);

    if (!inputTokenMeta || !outputTokenMeta) {
      return c.json(
        {
          message: `Token metadata not found.`,
        } satisfies ActionError,
        422,
      );
    }

    const tokenUsdPrices = await jupiterApi.getTokenPricesInUsdc([
      inputTokenMeta.address,
    ]);
    const tokenPriceUsd = tokenUsdPrices[inputTokenMeta.address];
    if (!tokenPriceUsd) {
      return c.json(
        {
          message: `Failed to get price for ${inputTokenMeta.symbol}.`,
        } satisfies ActionError,
        422,
      );
    }

    const tokenAmount =
      parseFloat(amount ?? DEFAULT_SWAP_AMOUNT_USD.toString()) /
      tokenPriceUsd.price;
    const tokenAmountFractional = Math.ceil(
      tokenAmount * 10 ** inputTokenMeta.decimals,
    );

    console.log(
      `Swapping ${tokenAmountFractional} ${inputTokenMeta.symbol} to ${outputTokenMeta.symbol}\nUSD amount: ${amount}\nToken USD price: ${tokenPriceUsd.price}\nToken amount: ${tokenAmount}\nToken amount fractional: ${tokenAmountFractional}`,
    );

    const quote = await jupiterApi.quoteGet({
      inputMint: inputTokenMeta.address,
      outputMint: outputTokenMeta.address,
      amount: tokenAmountFractional,
      autoSlippage: true,
      maxAutoSlippageBps: 500, // 5%
    });

    const swapResponse = await jupiterApi.swapPost({
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: account,
        prioritizationFeeLamports: 'auto',
      },
    });

    const response: ActionPostResponse = {
      transaction: swapResponse.swapTransaction,
    };

    return c.json(response);
  },
);

export default app;
