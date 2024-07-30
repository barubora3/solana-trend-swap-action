import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

const app = new OpenAPIHono();
const API_KEY = 'CG-WjPcpcvwpAzvDFKJhgCW5HXj';

const CoinSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  price_change_percentage_24h: z.number(),
  current_price: z.number(),
  market_cap: z.number().nullable(),
  total_volume: z.number(),
  ath: z.number(),
  ath_change_percentage: z.number(),
  days_since_ath: z.number(),
  ath_date: z.string(),
});

type Coin = z.infer<typeof CoinSchema>;

const ResponseSchema = z.object({
  trending_meme_coins: z.array(CoinSchema),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Trending Solana Meme Coins'],
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
          // 'x-cg-pro-api-key': API_KEY,
        },
      };
      console.log(options);
      const category = 'solana-meme-coins';

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${category}&order=volume_desc`,
        options,
      );

      if (!response.ok) {
        console.log(response);
        throw new Error('External API request failed');
      }

      const data = await response.json();
      console.log(data);

      const trendingMemeCoins = data
        .map((coin: any) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          price_change_percentage_24h: coin.price_change_percentage_24h,
          current_price: coin.current_price,
          market_cap: coin.market_cap,
          total_volume: coin.total_volume,
          ath: coin.ath,
          ath_change_percentage:
            ((coin.current_price - coin.ath) / coin.ath) * 100,
          days_since_ath: Math.floor(
            (new Date().getTime() - new Date(coin.ath_date).getTime()) /
              (1000 * 3600 * 24),
          ),
          ath_date: coin.ath_date,
        }))
        .sort(
          (a: Coin, b: Coin) =>
            Math.abs(b.price_change_percentage_24h) -
            Math.abs(a.price_change_percentage_24h),
        )
        .slice(0, 20);

      const validatedResponse = ResponseSchema.parse({
        trending_meme_coins: trendingMemeCoins,
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
    title: 'CoinGecko Trending API',
    version: '1.0.0',
  },
});

export default app;
