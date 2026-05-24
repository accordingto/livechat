import cairosvg, sys

SVG = """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#1e1e42"/>
      <stop offset="100%" stop-color="#07070e"/>
    </linearGradient>

    <!-- dot grid -->
    <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="9" cy="9" r="1" fill="#ffffff" fill-opacity="0.045"/>
    </pattern>

    <!-- bubble drop-shadow -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="5" stdDeviation="10"
                    flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- ── Background ── -->
  <rect width="180" height="180" fill="url(#bg)"/>
  <rect width="180" height="180" fill="url(#grid)"/>

  <!-- subtle accent glow top-centre -->
  <ellipse cx="90" cy="0" rx="90" ry="60" fill="#e94560" fill-opacity="0.07"/>

  <!-- ── Chat bubble (rounded rect + tail as one path) ──
       Body:  x=28 y=30 w=122 h=86 rx=22
       Arcs:  TL anchor (50,30) TR anchor (128,30)
              BR anchor (128,116) BL anchor (50,116)
       Tail:  base 50..78 on y=116, tip at (28,152)
  -->
  <path d="
    M 50,30
    L 128,30
    Q 150,30 150,52
    L 150,94
    Q 150,116 128,116
    L 78,116
    L 28,152
    L 50,116
    Q 28,116 28,94
    L 28,52
    Q 28,30 50,30
    Z"
    fill="white" fill-opacity="0.95"
    filter="url(#shadow)"/>

  <!-- ── Typing dots ── -->
  <circle cx="70"  cy="73" r="7.5" fill="#1e1e42" fill-opacity="0.42"/>
  <circle cx="89"  cy="73" r="7.5" fill="#1e1e42" fill-opacity="0.42"/>
  <circle cx="108" cy="73" r="7.5" fill="#1e1e42" fill-opacity="0.42"/>

  <!-- ── Live indicator (top-right bubble corner) ── -->
  <!-- outer glow halo -->
  <circle cx="143" cy="35" r="22" fill="#e94560" fill-opacity="0.18"/>
  <!-- dark punch-through ring (separates dot from bubble) -->
  <circle cx="143" cy="35" r="15" fill="#0a0a14"/>
  <!-- coloured ring -->
  <circle cx="143" cy="35" r="12.5" fill="none"
          stroke="#e94560" stroke-width="2" stroke-opacity="0.55"/>
  <!-- main dot -->
  <circle cx="143" cy="35" r="9" fill="#e94560"/>
  <!-- specular highlight -->
  <circle cx="140" cy="32" r="3" fill="white" fill-opacity="0.38"/>
</svg>
"""

cairosvg.svg2png(
    bytestring=SVG.encode(),
    write_to="apple-touch-icon.png",
    output_width=180,
    output_height=180,
)
print("apple-touch-icon.png generated (180x180)")
