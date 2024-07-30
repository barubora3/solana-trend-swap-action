import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import sharp from 'sharp';
import path from 'path';

const app = new OpenAPIHono();

const ImageGenerationSchema = z.object({
  iconUrl: z.string().url(),
  percentageIncrease: z.string(),
  priceIncrease: z.string(),
  symbol: z.string(),
});

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Image Generation'],
    request: {
      query: ImageGenerationSchema,
    },
    responses: {
      200: {
        content: {
          'image/png': {
            schema: {
              type: 'string',
              format: 'binary',
            },
          },
        },
        description: 'Generated image',
      },
      400: {
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: 'Bad request',
      },
    },
  }),
  async (c) => {
    const { iconUrl, percentageIncrease, priceIncrease, symbol } =
      c.req.query();

    // Load the base image
    const baseImagePath = path.join(process.cwd(), 'public', 'base.jpg');
    const baseImage = sharp(baseImagePath);

    // Get the dimensions of the base image
    const metadata = await baseImage.metadata();
    const baseWidth = metadata.width;
    const baseHeight = metadata.height;

    if (!baseWidth || !baseHeight) {
      return c.json({ error: 'Failed to get base image dimensions' }, 400);
    }

    // Download and process the icon
    const iconResponse = await fetch(iconUrl);
    const iconBuffer = await iconResponse.arrayBuffer();

    // Create a circular mask for the icon
    const circleRadius = 280;
    const circleMask = Buffer.from(`
      <svg width="${circleRadius * 2}" height="${circleRadius * 2}">
        <circle cx="${circleRadius}" cy="${circleRadius}" r="${circleRadius}" fill="white"/>
      </svg>
    `);

    // Process the icon: resize and apply circular mask
    const processedIcon = await sharp(Buffer.from(iconBuffer))
      .resize(circleRadius * 2, circleRadius * 2, { fit: 'cover' })
      .composite([
        {
          input: circleMask,
          blend: 'dest-in',
        },
      ])
      .toBuffer();

    // Add text with adjusted design
    const textSvg = `
    <svg width="${baseWidth}" height="${baseHeight}">
      <defs>
        <filter id="filter" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="linearRGB">
          <feDropShadow stdDeviation="5 5" in="SourceGraphic" dx="0" dy="0" flood-color="#000000" flood-opacity="0.5" x="0%" y="0%" width="100%" height="100%" result="dropShadow"/>
        </filter>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FF00FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#00FFFF;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="symbolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
        </linearGradient>
      </defs>
      <text x="${baseWidth / 2}" y="${baseHeight - 260}" 
            font-family="Arial Black, sans-serif" font-size="96" font-weight="900" 
            fill="url(#symbolGrad)" stroke="black" stroke-width="4"
            text-anchor="middle" filter="url(#filter)">
        ${symbol}
      </text>
     <text x="${baseWidth / 2}" y="${baseHeight - 260}" font-family="Arial Black, sans-serif" font-size="96" font-weight="900" fill="url(#symbolGrad)" text-anchor="middle" filter="url(#filter)">
        ${symbol}
      </text>
      <text x="${baseWidth / 2}" y="${baseHeight - 160}" font-family="Impact, sans-serif" font-size="80" font-weight="bold" fill="url(#grad)" text-anchor="middle" filter="url(#filter)" transform="rotate(-5 ${baseWidth / 2} ${baseHeight - 160})">
        🚀 SKYROCKETING! 🚀
      </text>
      <text x="${baseWidth / 2}" y="${baseHeight - 60}" font-family="Arial Black, sans-serif" font-size="64" font-weight="900" fill="#00FF00" text-anchor="middle" filter="url(#filter)" transform="rotate(-5 ${baseWidth / 2} ${baseHeight - 60})">
        +${percentageIncrease}% ($${priceIncrease})
      </text>
    </svg>
  `;

    // Calculate icon position
    const iconTop = Math.floor(baseHeight / 2) - circleRadius - 46;
    const iconLeft = Math.floor(baseWidth / 2) - circleRadius + 12;

    // Compose the final image
    const finalImage = await baseImage
      .composite([
        {
          input: processedIcon,
          top: iconTop,
          left: iconLeft,
        },
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    // Set the content type to image/png
    c.header('Content-Type', 'image/png');

    // Return the raw image data
    return c.body(finalImage);
  },
);

export default app;
