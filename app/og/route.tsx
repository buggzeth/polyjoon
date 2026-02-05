// app/og/route.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  
  const characterImageUrl = `https://nuke.farm/og-mascot.png`;

  try {
    // Fetch the image data and convert to base64 data URI
    const imageData = await fetch(characterImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      },
      cache: 'no-store', 
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:image/png;base64,${base64}`;
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
            <div style={{
               position: 'absolute',
               width: '350px',
               height: '350px',
               borderRadius: '50%',
               backgroundColor: '#ea580c',
               opacity: 0.15,
               filter: 'blur(5px)',
            }} />
            <img 
              // @ts-ignore
              src="https://nuke.farm/og-mascot.png"
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

  } catch (e: any) {
    console.error(`Error generating OG image: ${e.message}`);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}