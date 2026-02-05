// app/og/route.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  // 1. Determine the base URL
  const { protocol, host } = new URL(request.url);
  
  // 2. Construct image URL. 
  // IMPORTANT: Ensure 'public/og-mascot.png' exists in your project.
  const characterImage = `${protocol}//${host}/og-mascot.png`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#09090b', // Zinc-950
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
            display: 'flex', // Explicit flex needed
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
            display: 'flex', // Explicit flex needed
            fontSize: 80,
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            marginBottom: 20,
            letterSpacing: '-0.03em',
          }}>
            NUKE.FARM
          </div>

          {/* Subtitle - FIXED: Added display: flex and flexWrap */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: 32, 
            color: '#a1a1aa',
            lineHeight: 1.4,
            alignItems: 'center', // Aligns the text and the span
          }}>
            Autonomous agents pinching 
            {/* Added margin to span for spacing */}
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
          {/* Ensure 'public/og-mascot.png' exists, otherwise this will throw an error */}
          <img 
            src={characterImage}
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