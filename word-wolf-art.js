/* Small original vector object studies. Each literal object has one clear
 * silhouette; no scene, face or stock emoji is needed around the secret card. */
var WORD_WOLF_ART = (() => {
  'use strict';
  const drawings = {
    vase: '<path d="M65 23h30l-5 27c-1 12 23 25 21 43-2 23-60 23-62 0-2-18 22-31 21-43z" fill="#c9ddd2"/><path d="M65 23q15 8 30 0M60 78q20 12 40 0"/>',
    pot: '<path d="M43 53h74l-12 54H55z" fill="#debda2"/><path d="M38 42h84v17H38z" fill="#eee4d5"/><path d="M80 40V17m0 15C60 34 56 20 57 15c16-2 23 6 23 17m0-3c14 0 24-8 24-17-15-1-23 6-24 17" fill="#c9ddd2"/>',
    ladder: '<path d="M54 15v104M106 15v104M54 30h52M54 49h52M54 68h52M54 87h52M54 106h52" stroke-width="7"/>',
    'step-stool': '<path d="M42 61h49v-23h31v72H42z" fill="#d2dfd3"/><path d="M37 60h58M86 37h41M51 84h62M48 110v9m68-9v9"/>',
    suitcase: '<rect x="43" y="36" width="74" height="75" rx="10" fill="#c9ddd2"/><path d="M67 36V24q13-10 26 0v12M61 51v44m19-44v44m19-44v44M54 113v6m52-6v6"/>',
    trunk: '<rect x="29" y="43" width="102" height="64" rx="5" fill="#d4bb9b"/><path d="M29 64h102M50 43v64m60-64v64M66 43V29h28v14"/><rect x="72" y="57" width="16" height="16" rx="2" fill="#eee4d5"/>',
    umbrella: '<path d="M25 63a55 48 0 0 1 110 0q-17-15-35 0-20-15-40 0-18-15-35 0z" fill="#c9ddd2"/><path d="M80 14v84q0 21-15 15-8-3-8-12M80 15Q57 27 60 63m20-48q23 12 20 48"/>',
    parasol: '<path d="M24 69L80 19l56 50-23-6-16 9-17-9-17 9-17-9z" fill="#e8cfaa"/><path d="M80 19v99M80 19L46 63m34-44 33 44M80 19 63 72m17-53 17 53"/>',
    bowl: '<path d="M31 49h98c-4 39-21 53-49 53S35 88 31 49z" fill="#c9ddd2"/><ellipse cx="80" cy="49" rx="49" ry="12" fill="#eee9dd"/><path d="M62 105h36"/>',
    plate: '<ellipse cx="80" cy="70" rx="61" ry="37" fill="#e9e5d9"/><ellipse cx="80" cy="69" rx="44" ry="25" fill="#c9ddd2"/>',
    kettle: '<path d="M47 51q1-21 31-21t31 21l8 46q-39 19-78 0z" fill="#c9ddd2"/><path d="M47 51H30L20 30l25 12M108 45q34-9 30 17-2 16-23 15M56 30q0-30 43 0M69 23h18"/>',
    teapot: '<ellipse cx="80" cy="77" rx="40" ry="29" fill="#e8cfaa"/><path d="M42 76 21 48l28 12M116 62q32-11 25 13-5 16-24 13M55 49h50M61 48q19-20 38 0M80 37V27M66 109h28"/>',
    chopsticks: '<path d="M52 20 94 115M75 13l28 99" stroke-width="7"/><path d="m49 30 10-4m12 1 11-3" stroke="#789a86"/>',
    fork: '<path d="M64 16v30q16 24 32 0V16M80 17v96M64 40h32" stroke-width="6"/>',
    backpack: '<path d="M46 45q0-22 34-22t34 22v61H46z" fill="#c9ddd2"/><path d="M65 24v-9h30v9M46 46h68M40 49l-8 52m88-52 8 52"/><rect x="59" y="69" width="42" height="29" rx="6" fill="#eee9dd"/>',
    'tote-bag': '<path d="M37 46h86l-7 66H44z" fill="#e8cfaa"/><path d="M60 48V31q20-31 40 0v17M53 61v34m54-34v34"/>',
    ruler: '<path d="m30 101 78-78 24 24-78 78z" fill="#e8cfaa"/><path d="m44 87 9 9m4-22 6 6m7-19 9 9m4-22 6 6m7-19 9 9"/>',
    'measuring-tape': '<path d="M55 40h47q17 0 17 22v32H50V64q0-24 25-24" fill="#c9ddd2"/><path d="M50 94H23V80h27M119 80h22v14h-22"/><circle cx="85" cy="66" r="15" fill="#eee9dd"/>',
    textbook: '<path d="M43 24h77v84H43q-17 0-13-15V39q0-15 13-15" fill="#c9ddd2"/><path d="M43 24v84M31 95h89M61 44h41M61 59h33M61 73h39"/>',
    workbook: '<rect x="40" y="23" width="70" height="86" rx="4" fill="#eee9dd"/><path d="M34 34h14m-14 17h14m-14 17h14m-14 17h14M62 43h30M62 59h30M62 76h18"/><path d="m88 106 29-48 10 6-29 48-13 7z" fill="#e8cfaa"/>',
    phone: '<rect x="54" y="14" width="52" height="105" rx="10" fill="#c9ddd2"/><path d="M54 34h52M54 98h52M73 25h14"/><circle cx="80" cy="108" r="2"/>',
    tablet: '<rect x="29" y="23" width="102" height="83" rx="8" fill="#c9ddd2"/><rect x="39" y="33" width="78" height="63" rx="2" fill="#eee9dd"/><circle cx="124" cy="66" r="2"/>',
    router: '<rect x="33" y="72" width="94" height="32" rx="7" fill="#c9ddd2"/><path d="M48 73V29m64 44V29M78 72V18M46 89h4m11 0h4m11 0h4M66 24q14-12 28 0"/>',
    modem: '<rect x="56" y="22" width="49" height="86" rx="8" fill="#c9ddd2"/><path d="M48 111h65M69 39h3m-3 14h3m-3 14h3m-3 14h3M87 39v47"/>',
    printer: '<path d="M47 46V19h66v27" fill="#eee9dd"/><rect x="26" y="45" width="108" height="49" rx="9" fill="#c9ddd2"/><path d="M48 77h64v38H48z" fill="#eee9dd"/><path d="M60 91h38m-38 12h30M116 58h3"/>',
    scanner: '<path d="M29 79h104v30H29z" fill="#c9ddd2"/><path d="M30 79 49 26h72l13 53" fill="#eee9dd"/><path d="m46 67 12-29h52l9 29z" fill="#c9ddd2"/><path d="M106 95h10"/>',
    hoodie: '<path d="M63 19q17-10 34 0l18 16 24 32-19 14-12-16v52H52V65L40 81 21 67l24-32z" fill="#c9ddd2"/><path d="M63 19q-13 33 17 34 30-1 17-34M70 53v21m20-21v21M65 88h30v18H65z"/>',
    sweatshirt: '<path d="m60 24-24 13-20 34 22 13 16-23v52h52V61l16 23 22-13-20-34-24-13q-20 28-40 0z" fill="#c9ddd2"/><path d="M55 102h50M61 25q19 16 38 0"/>',
    scarf: '<path d="M44 29h43q31 11 12 33l-5 54H76l4-58-19 55H41l20-62q-26 4-17-22z" fill="#c9ddd2"/><path d="M43 105h19m14 2h20M45 114v8m8-8v8m24-6v7m9-7v7M57 40h39"/>',
    shawl: '<path d="m24 43 56-19 56 19-17 58-39-24-39 24z" fill="#e8cfaa"/><path d="M24 43 80 77l56-34M33 82l-6 12m15-6-3 14m75-14 5 14m8-20 7 12M65 32l15 8 15-8"/>',
    gloves: '<path d="M55 113 41 80 27 65q-7-11 5-14l14 11-8-31q-1-11 9-9l8 27-3-33q2-11 12-4l6 34 2-28q5-11 12-2l1 34 7-24q9-8 13 3l-8 44-4 40z" fill="#c9ddd2"/><path d="M52 99h46"/>',
    mittens: '<path d="M58 113 44 87 25 71q-7-13 5-18l19 11V40q0-25 27-25 29 0 29 30v68z" fill="#c9ddd2"/><path d="M55 99h49M50 62l13 14"/>',
    necktie: '<path d="m65 19 30 0-8 22 14 58-21 21-21-21 14-58z" fill="#c9ddd2"/><path d="M73 41h14M67 71l25 15M63 91l26 17"/>',
    'bow-tie': '<path d="m24 34 43 18v29l-43 18zM136 34 93 52v29l43 18z" fill="#c9ddd2"/><rect x="66" y="49" width="28" height="35" rx="7" fill="#e8cfaa"/><path d="m37 50 18 16-18 17m86-33-18 16 18 17"/>',
    flute: '<path d="M19 65h122v13H19z" fill="#c9ddd2"/><path d="M34 57v29m88-29v29M45 65v13m16-13v13m16-13v13m16-13v13m16-13v13"/>',
    clarinet: '<path d="m73 19 15-4-2 26 6 52 15 20H54l14-20 5-52z" fill="#c9ddd2"/><path d="M71 47h16m-15 12h17m-16 12h17m-16 12h17M62 104h38"/>',
    drum: '<ellipse cx="80" cy="53" rx="48" ry="16" fill="#eee9dd"/><path d="M32 53v43q48 31 96 0V53" fill="#c9ddd2"/><ellipse cx="80" cy="53" rx="48" ry="16"/><path d="m42 61 19 45 19-38 20 38 18-45M48 18l49 34M110 16 66 52"/>',
    bongo: '<path d="m22 52 8 50q25 13 50 0l8-50M80 45l8 45q23 12 46-1l8-44" fill="#c9ddd2"/><ellipse cx="55" cy="52" rx="34" ry="12" fill="#eee9dd"/><ellipse cx="111" cy="45" rx="31" ry="11" fill="#eee9dd"/>',
    piano: '<path d="M28 26h104v78H28z" fill="#c9ddd2"/><path d="M21 69h118v27H21z" fill="#eee9dd"/><path d="M37 71v24m18-24v24m18-24v24m18-24v24m18-24v24m18-24v24M35 105v13m90-13v13M43 43h74"/>',
    keyboard: '<rect x="17" y="43" width="126" height="56" rx="7" fill="#c9ddd2"/><path d="M25 64h110v27H25z" fill="#eee9dd"/><path d="M39 65v25m16-25v25m16-25v25m16-25v25m16-25v25m16-25v25M30 54h3m10 0h3m12 0h28m14 0h3m10 0h3"/>',
    microphone: '<rect x="61" y="15" width="38" height="64" rx="19" fill="#c9ddd2"/><path d="M51 55v7q0 34 29 34t29-34v-7M80 96v18m-21 3h42M63 36h34M63 50h34"/>',
    megaphone: '<path d="m39 52 81-29v80L39 74z" fill="#c9ddd2"/><path d="M28 51h17v25H28zM67 85l8 29H57l-9-32M131 43l13-7m-12 30h15m-16 20 13 8"/>',
  };
  function item(id) {
    if (!Object.prototype.hasOwnProperty.call(drawings, id)) return '';
    return `<svg class="ww-object-art" viewBox="0 0 160 132" fill="none" stroke="#273d34" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[id]}</svg>`;
  }
  return { item, ids: Object.freeze(Object.keys(drawings)) };
})();
if (typeof module === 'object' && module.exports) module.exports = WORD_WOLF_ART;
