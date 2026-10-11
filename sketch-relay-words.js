/* Sketch Relay secret words. Original list written for this site: simple,
 * drawable English for voice-chat learners. No slang, brands, holidays or
 * culture-specific ideas. Easy words are single things or actions you can
 * point at; tricky ones are small scenes that need two or three ideas drawn
 * together. Each player's word card is dealt from these lists at random. */
(function (root, factory) {
  const words = factory();
  if (typeof module === 'object' && module.exports) module.exports = words;
  else root.SKETCH_RELAY_WORDS = words;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const easy = [
    // animals
    'cat', 'dog', 'fish', 'bird', 'cow', 'pig', 'horse', 'rabbit', 'snake', 'frog',
    'turtle', 'lion', 'tiger', 'elephant', 'giraffe', 'monkey', 'penguin', 'owl', 'bee', 'spider',
    'shark', 'whale', 'octopus', 'crab', 'snail', 'duck', 'chicken', 'sheep', 'mouse', 'bear',
    'zebra', 'camel', 'dolphin', 'butterfly', 'kangaroo', 'panda', 'fox', 'bat', 'ladybug', 'jellyfish',
    'dinosaur', 'unicorn', 'dragon', 'parrot', 'goat', 'deer', 'squirrel', 'koala', 'flamingo', 'worm',
    // food and drink
    'pizza', 'banana', 'apple', 'cake', 'ice cream', 'hamburger', 'egg', 'bread', 'cheese', 'carrot',
    'watermelon', 'cookie', 'noodles', 'sandwich', 'popcorn', 'grapes', 'lemon', 'strawberry', 'corn', 'donut',
    'hot dog', 'candy', 'cupcake', 'pineapple', 'mushroom', 'onion', 'rice', 'soup', 'sushi', 'chocolate',
    'milk', 'coffee', 'cherry', 'broccoli', 'potato', 'tomato', 'pancake', 'dumpling', 'coconut', 'peach',
    // things at home
    'chair', 'table', 'bed', 'door', 'window', 'key', 'lamp', 'clock', 'phone', 'computer',
    'book', 'pencil', 'scissors', 'umbrella', 'glasses', 'hat', 'shoe', 'sock', 'shirt', 'dress',
    'ring', 'backpack', 'cup', 'spoon', 'fork', 'bottle', 'box', 'ball', 'kite', 'balloon',
    'guitar', 'piano', 'drum', 'camera', 'television', 'mirror', 'toothbrush', 'comb', 'candle', 'ladder',
    'bucket', 'broom', 'hammer', 'light bulb', 'battery', 'wallet', 'map', 'gift', 'crown', 'sword',
    'anchor', 'bell', 'flag', 'trophy', 'puzzle', 'dice', 'teddy bear', 'pillow', 'sofa', 'fridge',
    'toilet', 'towel', 'soap', 'envelope', 'magnet', 'headphones', 'jacket', 'tie', 'necklace', 'robot',
    // getting around
    'rocket', 'airplane', 'car', 'bus', 'train', 'bicycle', 'boat', 'ship', 'truck', 'helicopter',
    'motorcycle', 'taxi', 'tractor', 'submarine', 'skateboard', 'parachute',
    // nature and weather
    'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'rainbow', 'tree', 'flower', 'leaf',
    'mountain', 'river', 'island', 'volcano', 'beach', 'desert', 'waterfall', 'fire', 'lightning', 'tornado',
    'cactus', 'rose', 'sunflower', 'rock', 'cave', 'forest', 'wave', 'planet', 'shell', 'feather',
    // places
    'house', 'castle', 'school', 'hospital', 'bridge', 'tent', 'lighthouse', 'farm', 'zoo', 'park',
    'library', 'airport', 'igloo', 'pyramid', 'windmill', 'tower', 'kitchen', 'swimming pool', 'playground', 'garden',
    // people and characters
    'doctor', 'teacher', 'chef', 'pilot', 'farmer', 'firefighter', 'astronaut', 'pirate', 'king', 'queen',
    'clown', 'ghost', 'wizard', 'ninja', 'baby', 'grandma', 'superhero', 'vampire', 'alien', 'snowman',
    'princess', 'knight', 'scientist', 'painter', 'singer', 'dancer', 'mermaid', 'zombie', 'detective', 'nurse',
    // actions
    'sleeping', 'swimming', 'running', 'dancing', 'singing', 'cooking', 'reading', 'crying', 'laughing', 'jumping',
    'fishing', 'painting', 'flying', 'climbing', 'sneezing', 'yawning', 'skiing', 'surfing', 'juggling', 'waving',
    'hugging', 'shopping', 'driving', 'camping', 'knitting', 'whispering', 'snoring', 'diving', 'bowling', 'brushing teeth',
  ];
  const tricky = [
    'traffic jam', 'birthday party', 'haunted house', 'time machine', 'snowball fight', 'lost luggage',
    'flat tire', 'power cut', 'sunburn', 'bad dream', 'first day of school', 'job interview',
    'hiccups', 'sleepwalking', 'magic trick', 'treasure map', 'fire alarm', 'road trip',
    'rainy day', 'hot air balloon', 'roller coaster', 'shooting star', 'pillow fight', 'wedding',
    'haircut', 'toothache', 'broken heart', 'melting snowman', 'missing the bus', 'selfie',
    'video call', 'high five', 'tug of war', 'hide and seek', 'spelling test', 'lost keys',
    'stuck in an elevator', 'falling asleep in class', 'surprise party', 'flying car', 'underwater city', 'space station',
    'robot chef', 'dancing bear', 'lazy cat', 'angry chef', 'world record', 'family photo',
    'sand castle', 'snow angel', 'message in a bottle', 'paper airplane', 'ice skating', 'full moon',
    'earthquake', 'piggy bank', 'fireworks', 'thunderstorm', 'spaghetti dinner', 'breakfast in bed',
    'sneaky thief', 'mad scientist', 'shy ghost', 'sleepy dragon', 'happy cloud', 'singing fish',
    'dog walker', 'bus driver', 'lifeguard', 'tour guide', 'baby sitter', 'news reporter',
    'self-driving car', 'talking parrot', 'giant spider', 'tiny elephant', 'pizza delivery', 'fast food',
    'gym workout', 'yoga class', 'marathon', 'tightrope walker', 'magic carpet', 'genie in a lamp',
    'zip line', 'bungee jump', 'water slide', 'merry-go-round', 'ferris wheel', 'bumper cars',
    'street market', 'cake shop', 'treasure chest', 'pirate ship', 'desert island', 'jungle',
    'north pole', 'rain forest', 'outer space', 'black hole', 'solar eclipse', 'alien invasion',
    'forgot my lines', 'stage fright', 'dance battle', 'karaoke night', 'talent show', 'standing ovation',
    'homework', 'exam stress', 'graduation', 'lunch break', 'coffee break', 'office party',
    'moving house', 'new neighbor', 'noisy neighbor', 'house plant', 'spring cleaning', 'laundry day',
    'grocery list', 'shopping cart', 'long queue', 'lost phone', 'dead battery', 'slow internet',
    'online class', 'group chat', 'phone addiction', 'late night snack', 'sunrise jog', 'morning person',
    'sneaky cat', 'proud parent', 'cheering fans', 'winning goal', 'penalty kick', 'gold medal',
    'chess game', 'card trick', 'jigsaw puzzle', 'board game night', 'hot soup', 'spicy food',
    'melting ice cream', 'burnt toast', 'pancake flip', 'food fight', 'picnic', 'barbecue',
    'beach umbrella', 'sun cream', 'sea monster', 'shipwreck', 'lighthouse keeper', 'fishing trip',
  ];
  return Object.freeze({ easy: Object.freeze(easy), tricky: Object.freeze(tricky) });
});
