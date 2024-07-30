import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import jupiterApi from '../../api/jupiter-api'; // JupiterのAPIパスを適切に調整してください

const app = new OpenAPIHono();

const SwapPathSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  price_change_percentage_24h: z.number(),
  current_price: z.number(),
  swap_path: z.string(),
});

const ResponseSchema = z.object({
  swap_paths: z.array(SwapPathSchema),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Solana Meme Coins Swap Paths'],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: ResponseSchema,
          },
        },
        description: 'Successful response',
      },
      500: {
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
        description: 'Internal server error',
      },
    },
  }),
  async (c) => {
    try {
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      };
      const category = 'solana-meme-coins';

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${category}&order=volume_desc`,
        options,
      );

      if (!response.ok) {
        throw new Error('External API request failed');
      }

      const data = await response.json();

      const validatedSwapPaths = await Promise.all(
        data.map(async (coin: any) => {
          try {
            // Jupiter APIでトークンの検証
            const tokenMeta = await jupiterApi.lookupToken(
              coin.symbol.toUpperCase(),
            );
            if (!tokenMeta) {
              console.log(`Skipping ${coin.symbol}: Not found in Jupiter API`);
              return null; // トークンが見つからない場合はnullを返す
            }

            const percentageIncrease =
              coin.price_change_percentage_24h.toFixed(2);
            const priceIncrease = (coin.current_price - coin.low_24h).toFixed(
              6,
            );

            const doubleEncodedIconUrl = encodeURIComponent(
              encodeURIComponent(coin.image),
            );
            return {
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol.toUpperCase(),
              price_change_percentage_24h: coin.price_change_percentage_24h,
              current_price: coin.current_price,
              // swap_path: `/api/jupiter/swap/${coin.symbol.toUpperCase()}/${doubleEncodedIconUrl}/${percentageIncrease}/${priceIncrease}`,
              swap_path: `/api/jupiter/swap/${coin.id}`,
            };
          } catch (error) {
            console.error(`Error processing ${coin.symbol}:`, error);
            return null; // エラーが発生した場合もnullを返す
          }
        }),
      );

      const swapPaths = validatedSwapPaths
        .filter((path): path is SwapPathSchema => path !== null) // null値を除外
        .sort(
          (a, b) =>
            b.price_change_percentage_24h - a.price_change_percentage_24h,
        )
        .slice(0, 5); // 上位5つのコインのみを返す

      const validatedResponse = ResponseSchema.parse({
        swap_paths: swapPaths,
      });
      return c.json(validatedResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorResponse = ErrorResponseSchema.parse({
        error: 'Failed to fetch data',
      });
      return c.json(errorResponse, 500);
    }
  },
);

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    title: 'Solana Meme Coins Swap Paths API',
    version: '1.0.0',
  },
});

export default app;
