(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.ONCE_MODERN_FUTURE_DECK = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Original Hub expansion, selected as a separate world, never mixed into Classic.
  // Familiar words may overlap; IDs and modern-world paintings remain separate.
  // Fourth column is the meaning-matched artwork brief, fifth marks Interrupt.
  const assetRoot = 'assets/once-upon-a-time/modern-future/';
  const groups = [
  [
    "character",
    [
      [
        "doctor",
        "Doctor",
        "An adult doctor in scrubs with a stethoscope checking a patient in a bright modern clinic.",
        true
      ],
      [
        "scientist",
        "Scientist",
        "An adult scientist in a lab coat examining a small glowing sample in a modern laboratory.",
        false
      ],
      [
        "robot",
        "Robot",
        "A friendly clearly mechanical humanoid robot waving in a near-future city street.",
        true
      ],
      [
        "pilot",
        "Pilot",
        "An adult space pilot seated at the controls of a small spacecraft; stars beyond the cockpit.",
        false
      ],
      [
        "driver",
        "Driver",
        "An adult driver at the wheel of a city bus, wearing everyday clothing, with a road visible ahead.",
        false
      ],
      [
        "student",
        "Student",
        "An adult university student carrying books and a backpack outside a modern campus.",
        false
      ],
      [
        "detective",
        "Detective",
        "An adult detective examining a clue on a city sidewalk with a small magnifying glass.",
        false
      ],
      [
        "neighbor",
        "Neighbor",
        "A friendly adult neighbor standing at an apartment doorway, offering a small bowl of food.",
        false
      ],
      [
        "astronaut",
        "Astronaut",
        "A single astronaut in a white spacesuit on the moon, Earth visible in the black sky.",
        false
      ],
      [
        "friend",
        "Friend",
        "Two adult friends laughing together while sitting on a contemporary park bench.",
        false
      ],
      [
        "stranger",
        "Stranger",
        "A mysterious but harmless adult stranger waiting at a modern railway platform with a suitcase.",
        false
      ],
      [
        "hacker",
        "Hacker",
        "An adult computer hacker focused on a laptop in a dim contemporary room, abstract screens with no legible text.",
        false
      ]
    ]
  ],
  [
    "thing",
    [
      [
        "phone",
        "Phone",
        "One ordinary modern smartphone glowing on a café table, clear phone shape, abstract screen with no text.",
        false
      ],
      [
        "key",
        "Key",
        "A single silver apartment door key with a small blue keyring on a contemporary wooden desk.",
        false
      ],
      [
        "book",
        "Book",
        "One open paperback book on a modern desk beside a simple lamp, pages without readable words.",
        false
      ],
      [
        "drone",
        "Drone",
        "A compact four-propeller camera drone hovering over a near-future city rooftop.",
        true
      ],
      [
        "battery",
        "Battery",
        "A compact rechargeable battery pack with a glowing charge indicator, futuristic workshop backdrop.",
        false
      ],
      [
        "ticket",
        "Ticket",
        "A single train ticket beside a modern platform barrier, no legible numbers or text.",
        false
      ],
      [
        "bike",
        "Bike",
        "A familiar city bicycle parked beside an apartment building in soft morning light.",
        false
      ],
      [
        "map",
        "Map",
        "A folded paper street map lying on a modern café table, abstract roads with no text.",
        false
      ],
      [
        "camera",
        "Camera",
        "A clearly recognizable digital camera with a lens and strap on a modern table.",
        false
      ],
      [
        "spaceship",
        "Spaceship",
        "A small elegant science-fiction spaceship floating above a blue planet, full ship visible.",
        true
      ],
      [
        "headphones",
        "Headphones",
        "A pair of everyday over-ear headphones resting on a modern desk.",
        false
      ],
      [
        "package",
        "Package",
        "A sealed cardboard delivery parcel with blank shipping label outside a modern apartment door.",
        false
      ]
    ]
  ],
  [
    "place",
    [
      [
        "city",
        "City",
        "A lively modern city skyline at blue hour with trains and ordinary illuminated buildings.",
        false
      ],
      [
        "apartment",
        "Apartment",
        "A cozy contemporary apartment living room with sofa, house plants and city windows.",
        false
      ],
      [
        "station",
        "Station",
        "A contemporary railway station with a clearly visible train and platform, no sign text.",
        false
      ],
      [
        "hospital",
        "Hospital",
        "A clean modern hospital entrance and reception area, subtle medical cross, no words.",
        false
      ],
      [
        "school",
        "School",
        "A contemporary school campus courtyard with classroom buildings and backpacks, no text.",
        false
      ],
      [
        "cafe",
        "Café",
        "A welcoming modern neighborhood café interior with coffee cups and warm lamps.",
        false
      ],
      [
        "laboratory",
        "Laboratory",
        "A spacious near-future research laboratory with microscopes and glowing sample chambers.",
        true
      ],
      [
        "spaceport",
        "Spaceport",
        "A futuristic spaceport with parked spacecraft and an observation terminal under a starry sky.",
        true
      ],
      [
        "moon",
        "Moon",
        "The rocky surface of the moon with a small distant lunar base and Earth in the black sky.",
        false
      ],
      [
        "park",
        "Park",
        "A contemporary city park with a walking path, leafy trees and benches.",
        false
      ],
      [
        "tunnel",
        "Tunnel",
        "A long modern pedestrian tunnel with clear perspective and soft blue overhead lights.",
        false
      ],
      [
        "rooftop",
        "Rooftop",
        "A contemporary apartment rooftop garden overlooking a city at sunset.",
        false
      ]
    ]
  ],
  [
    "aspect",
    [
      [
        "happy",
        "Happy",
        "An adult person visibly joyful, smiling and laughing in a contemporary park.",
        false
      ],
      [
        "lost",
        "Lost",
        "An adult traveler at a modern city crossroads looking confused at a folded map.",
        false
      ],
      [
        "hidden",
        "Hidden",
        "A small glowing device visibly half-hidden behind a bookshelf in a modern apartment.",
        false
      ],
      [
        "broken",
        "Broken",
        "A clearly broken household robot with one detached arm and harmless scattered pieces in a modern workshop.",
        true
      ],
      [
        "brave",
        "Brave",
        "A calm adult stepping forward to help a frightened traveler on a dark but safe city platform.",
        false
      ],
      [
        "lonely",
        "Lonely",
        "A single adult sitting alone on a contemporary park bench at dusk, wistful mood.",
        false
      ],
      [
        "famous",
        "Famous",
        "An adult arriving at a modern event while photographers gather and friendly fans wave.",
        false
      ],
      [
        "invisible",
        "Invisible",
        "An invisible person suggested by an empty transparent human-shaped outline holding a floating coffee cup in a modern café.",
        true
      ],
      [
        "friendly",
        "Friendly",
        "A smiling adult warmly welcoming a new neighbor at a modern apartment entrance.",
        false
      ],
      [
        "electric",
        "Electric",
        "A futuristic device surrounded by bright harmless blue electrical arcs in a workshop.",
        false
      ],
      [
        "tiny",
        "Tiny",
        "A tiny friendly robot, smaller than a coffee cup, standing beside that cup on a modern desk.",
        false
      ],
      [
        "suspicious",
        "Suspicious",
        "An adult in everyday clothes giving a doubtful sideways glance at an unopened parcel in a modern lobby.",
        false
      ]
    ]
  ],
  [
    "event",
    [
      [
        "rescue",
        "Rescue",
        "A rescue worker helping an adult traveler out of a stranded modern bus, reassuring daylight scene.",
        false
      ],
      [
        "chase",
        "Chase",
        "Two adults in everyday clothes in a playful running chase along a modern city street, no weapons.",
        false
      ],
      [
        "discovery",
        "Discovery",
        "A scientist opening a small capsule to discover a living glowing plant in a futuristic lab.",
        true
      ],
      [
        "repair",
        "Repair",
        "An adult fixing a friendly household robot with a screwdriver at a contemporary workbench.",
        false
      ],
      [
        "reunion",
        "Reunion",
        "Two adult friends warmly hugging after meeting on a modern railway platform.",
        false
      ],
      [
        "blackout",
        "Blackout",
        "A modern city street suddenly dark with unlit buildings, residents illuminating it with flashlights.",
        true
      ],
      [
        "launch",
        "Launch",
        "A futuristic rocket lifting off from a launchpad, bright plume, safe distant view.",
        false
      ],
      [
        "landing",
        "Landing",
        "A small spacecraft settling gently onto a lunar landing pad, dust below it.",
        false
      ],
      [
        "escape",
        "Escape",
        "An adult rushing through an open modern building exit into sunlight, no violence.",
        false
      ],
      [
        "surprise",
        "Surprise",
        "Friends surprising an adult with a small birthday cake in a modern apartment, joyful expressions.",
        false
      ],
      [
        "argument",
        "Argument",
        "Two adults disagreeing animatedly but nonviolently over a street map in a modern café.",
        false
      ],
      [
        "signal",
        "Signal",
        "A futuristic communications dish receiving a visible glowing pulse from a small spacecraft in the starry sky.",
        false
      ]
    ]
  ]
];
  // Profile 2: three Interrupts per category (15/60). Profile 3 (current new
  // deals) adds Stranger and Escape: 17/60 = 28.3%, a little above the official
  // core deck's 20.2%. The original ten and profile-2 IDs stay for saved games.
  const extraInterruptIds = new Set([
    'once-mf-character-astronaut', 'once-mf-thing-phone', 'once-mf-place-city',
    'once-mf-aspect-hidden', 'once-mf-event-rescue'
  ]);
  const profile3InterruptIds = new Set(['once-mf-character-stranger', 'once-mf-event-escape']);
  const legacyInterruptIds = Object.freeze(groups.flatMap(([category, rows]) =>
    rows.filter(([, , , isInterrupt]) => isInterrupt).map(([slug]) => 'once-mf-' + category + '-' + slug)));
  const profile2InterruptIds = Object.freeze(groups.flatMap(([category, rows]) =>
    rows.filter(([slug, , , isInterrupt]) => isInterrupt === true || extraInterruptIds.has('once-mf-' + category + '-' + slug))
      .map(([slug]) => 'once-mf-' + category + '-' + slug)));
  const storyCards = Object.freeze(groups.flatMap(([category, rows]) => rows.map(([slug, title, artBrief, isInterrupt]) => Object.freeze({
    id: 'once-mf-' + category + '-' + slug, world: 'modern-future', category, title,
    isInterrupt: isInterrupt === true || extraInterruptIds.has('once-mf-' + category + '-' + slug) || profile3InterruptIds.has('once-mf-' + category + '-' + slug), artKey: 'modern-future.' + category + '.' + slug,
    imagePath: assetRoot + category + '/' + slug + '-v1.webp',
    thumbnailPath: assetRoot + category + '/' + slug + '-v1-thumb.webp', artBrief
  }))));
  const endings = [
  [
    "home",
    "At last, they found a place that felt like home.",
    "Friends resting together in a welcoming modern apartment, sunset city outside the window."
  ],
  [
    "last-train",
    "They caught the last train and left their worries behind.",
    "Two relieved adult travelers stepping onto the final train at a modern station at night."
  ],
  [
    "new-friend",
    "The stranger became the friend they had needed all along.",
    "Two adult strangers now warmly shaking hands with smiles on a modern park bench."
  ],
  [
    "robot-friend",
    "The robot stayed, and nobody felt alone again.",
    "A friendly household robot and an adult sharing tea in a cozy modern apartment."
  ],
  [
    "city-lights",
    "One by one, the city lights came back on.",
    "A modern city recovering from a blackout, windows and streetlights glowing again at dusk."
  ],
  [
    "small-beginning",
    "A small idea became the beginning of something bigger.",
    "A scientist and friends marveling at a small prototype projecting a hopeful future city model."
  ],
  [
    "message",
    "The message arrived just when they needed it most.",
    "A relieved adult reading a glowing smartphone notification, no text, on a quiet modern train."
  ],
  [
    "earth",
    "They returned to Earth with a story nobody would forget.",
    "A spacecraft landed on a grassy Earth field while astronauts greet friends with an embrace."
  ],
  [
    "moon-garden",
    "Their first garden on the moon began to grow.",
    "Green seedlings growing in a transparent lunar greenhouse with Earth visible overhead."
  ],
  [
    "repaired",
    "They fixed what was broken and tried again.",
    "An adult and a happily reassembled household robot sharing a celebratory high-five at a workbench."
  ],
  [
    "shared-secret",
    "They kept one secret between them and smiled.",
    "Two adult friends quietly smiling over a small closed futuristic capsule in a modern apartment."
  ],
  [
    "saved-place",
    "The place they saved became a home for everyone.",
    "A welcoming renovated contemporary community center with a diverse group of adults gathering."
  ],
  [
    "open-door",
    "Someone opened the door, and a new adventure began.",
    "An adult opening an ordinary apartment door onto a surprising glowing futuristic city beyond."
  ],
  [
    "lessons",
    "They learned more from their mistake than from their plan.",
    "Two adult inventors smiling at an imperfect homemade robot, workbench with abandoned diagrams."
  ],
  [
    "sunrise",
    "By sunrise, they had found their way back to each other.",
    "Two adult friends reunited on a contemporary rooftop at sunrise."
  ],
  [
    "sky",
    "From then on, the sky no longer seemed so far away.",
    "Friends gazing upward as a small passenger spacecraft rises above a modern city."
  ],
  [
    "ordinary-day",
    "The adventure ended, but ordinary life looked different now.",
    "An adult enjoying a quiet morning coffee by an apartment window while a friendly small robot watches."
  ],
  [
    "next-stop",
    "They chose their next destination together.",
    "Friends pointing together at an abstract map while looking through a spacecraft window at stars."
  ]
];
  const endingCards = Object.freeze(endings.map(([slug, text, artBrief]) => Object.freeze({
    id: 'once-mf-ending-' + slug, world: 'modern-future', text,
    artKey: 'modern-future.ending.' + slug,
    imagePath: assetRoot + 'ending/' + slug + '-v1.webp',
    thumbnailPath: assetRoot + 'ending/' + slug + '-v1-thumb.webp', artBrief
  })));
  return Object.freeze({ id: 'modern-future', title: 'Modern & Future', storyCards, endingCards, legacyInterruptIds, profile2InterruptIds });
});
