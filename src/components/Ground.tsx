export function Ground() {
  return (
    <svg className="ground" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
      <path className="ground__hill-back" d="M0,45 Q100,15 200,35 T400,25 V100 H0 Z" />
      <path className="ground__hill-mid" d="M0,60 Q110,32 210,52 T400,42 V100 H0 Z" />
      <path className="ground__hill-front" d="M0,80 Q120,55 220,76 T400,66 V100 H0 Z" />
      <g className="ground__cloud" transform="translate(42,8)">
        <ellipse cx="0" cy="6" rx="14" ry="8" />
        <ellipse cx="12" cy="2" rx="10" ry="7" />
        <ellipse cx="-12" cy="3" rx="9" ry="6" />
      </g>
      <g className="ground__cloud" transform="translate(300,4)">
        <ellipse cx="0" cy="6" rx="11" ry="6.5" />
        <ellipse cx="10" cy="3" rx="8" ry="5.5" />
      </g>
      <path className="ground__star" d="M335,10 l1.8,3.8 4.2,0.6 -3,2.9 0.7,4.1 -3.7,-2 -3.7,2 0.7,-4.1 -3,-2.9 4.2,-0.6 Z" />
      <circle className="ground__dot" cx="72" cy="84" r="3.5" />
      <circle className="ground__dot ground__dot--pink" cx="255" cy="88" r="3" />
      <circle className="ground__dot" cx="340" cy="86" r="2.5" />
    </svg>
  );
}
