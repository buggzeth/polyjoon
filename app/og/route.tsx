// app/og/route.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  // 1. Fetch the image manually to ensure we have the data
  // Note: Using the absolute URL ensures it works, but ensure 'nuke.farm' 
  // is accessible from where this function runs (e.g. Vercel).
  const imageUrl = `https://nuke.farm/og-mascot.png`;
  
  const imageBuffer = await fetch(imageUrl).then((res) => {
      if (!res.ok) throw new Error('Failed to fetch image');
      return res.arrayBuffer();
  });

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#09090b',
          fontFamily: 'monospace',
        }}
      >
        {/* TEXT SIDE */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '60%', 
          height: '100%',
          padding: '70px',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          
          {/* Badge */}
          <div style={{
            display: 'flex',
            backgroundColor: '#ea580c',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '50px',
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 30,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Beta Access
          </div>

          {/* Title */}
          <div style={{
            display: 'flex',
            fontSize: 80,
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            marginBottom: 20,
            letterSpacing: '-0.03em',
          }}>
            NUKE.FARM
          </div>

          {/* Subtitle */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: 32, 
            color: '#a1a1aa',
            lineHeight: 1.4,
            alignItems: 'center',
          }}>
            Autonomous agents pinching 
            <span style={{ color: '#fdba74', marginLeft: '8px', marginRight: '8px' }}>alpha</span> 
            from prediction markets.
          </div>
        </div>

        {/* IMAGE SIDE */}
        <div style={{ 
          display: 'flex', 
          width: '40%', 
          height: '100%', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#18181b',
          borderLeft: '4px solid #27272a',
          position: 'relative',
        }}>
          {/* Glow */}
          <div style={{
             position: 'absolute',
             width: '350px',
             height: '350px',
             borderRadius: '50%',
             backgroundColor: '#ea580c',
             opacity: 0.15,
             filter: 'blur(5px)',
          }} />

          {/* Image */}
          {/* We cast imageBuffer to 'any' to satisfy TypeScript, 
              as Satori accepts ArrayBuffer for src */}
          <img 
            src={imageBuffer as any}
            width="400"
            height="400"
            style={{
              width: '85%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0px 10px 25px rgba(0,0,0,0.4))',
              transform: 'scale(1.1)',
            }} 
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}