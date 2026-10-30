/* CUT! 🎃 Halloween edition: original spooky-but-friendly easy English topics.
 * `take` is for Mode 1 · Take Over: a question plus a half-sentence opening the
 * next player can continue. `jump` is for Mode 2 · Jump In: one Main Speaker
 * talks for a few minutes. Spooky, never gory. Neither pool is mixed with the
 * classic banks in cut-topics.js or cut-jump-topics.js.
 * Add prompts here without changing the screens or the game rules.
 */
var CUT_HALLOWEEN_TOPICS = (() => {
  'use strict';
  const take = [
    ['We spend one night in an old haunted house. What happens at midnight?', 'At exactly twelve o’clock, the lights go out and…'],
    ['You put on a Halloween mask, and you cannot take it off. What happens next?', 'I pull as hard as I can, but the mask…'],
    ['A black cat follows you home and starts to talk. What does it want?', 'The cat sits on my bed and says…'],
    ['We find an old map in the attic. Where does it lead?', 'The map shows a door under the stairs, and behind it…'],
    ['Your phone gets a message from someone who lives in the mirror.', 'The message says, “Look behind you,” so I…'],
    ['We go trick-or-treating, and one house gives us very strange candy.', 'I eat one piece, and suddenly…'],
    ['A friendly ghost moves into your apartment. What is the problem?', 'The ghost is very nice, but every night it…'],
    ['You wake up as a vampire, but you are afraid of the dark.', 'On my first night as a vampire, I…'],
    ['We get lost in a corn maze on Halloween night.', 'We turn left three times, and then we see…'],
    ['A pumpkin on your doorstep starts to glow and hum a song.', 'I lean closer, and the pumpkin…'],
    ['The school is empty at night, but the piano is playing. Who is there?', 'We open the music room door slowly and…'],
    ['You buy an old doll at a market. Why do you want to give it back?', 'Every morning the doll is in a different place, and today it…'],
    ['We take a photo by the old church, and there is one extra person in it.', 'I zoom in on the photo and see…'],
    ['A witch asks you to look after her broom for one night.', 'She tells me never to sit on it, but…'],
    ['The elevator stops at floor 13, but our building has only 12 floors.', 'The doors open, and in front of us…'],
    ['You find a spell book in the library. What spell do you try first?', 'I read the first spell out loud, and…'],
    ['We stay at a hotel where every guest has the same smile.', 'At breakfast, the manager quietly tells us…'],
    ['A mummy comes to your party and will not go home.', 'We try to be polite, but the mummy keeps…'],
    ['Your shadow starts to move on its own. Where does it go?', 'I stand very still, but my shadow…'],
    ['We hear knocking from inside a closet. Who opens it?', 'Knock, knock, knock. Then a small voice says…'],
    ['A werewolf is your new neighbor. What happens at the full moon?', 'Our neighbor seems normal until the moon comes out, and then…'],
    ['You win a free night in a castle. What is the catch?', 'The castle is beautiful, but the rules on the door say…'],
    ['The lights in the house blink like a secret message. What is it saying?', 'On, off, on, off… I think it means…'],
    ['A skeleton joins our dance class. Why is everyone watching?', 'The music starts, and the skeleton…'],
    ['You open a fortune cookie, and the message is about tonight.', 'The little paper says…'],
    ['We find a door in the forest with no house around it.', 'Someone knocks on the door, and from the other side…'],
    ['Your costume becomes real at midnight. What are you now?', 'The clock strikes twelve, and suddenly I can…'],
    ['An old radio turns on by itself and talks to us.', 'Through the noise, a voice says our names and…'],
    ['A bat flies into the kitchen and refuses to leave.', 'We try everything to get it out, but the bat…'],
    ['We are the last people on a night bus, and the driver never turns around.', 'The bus stops on a dark street, and the driver…'],
    ['Grandma’s cookie recipe has one secret ingredient, and it is not normal.', 'I open the old recipe book and read…'],
    ['Someone in our group has been a ghost all along. How do we find out?', 'The first clue is that they never…'],
    ['A scarecrow in the field waves at you. Do you wave back?', 'I wave back, and the scarecrow…'],
    ['We finish decorating pumpkins, and one pumpkin changes its face.', 'Its new face looks right at me and…'],
    ['A candle will not go out, no matter what we do.', 'We blow, we wave, we pour water, and still…'],
    ['You hear your name whispered in an empty room.', 'I turn around, and in the corner…'],
    ['A zombie wants us to teach it English. What is the first lesson?', 'We start with easy words, but the zombie only says…'],
    ['The full moon is so bright that everything changes color.', 'Under the strange light, my cat…'],
    ['We find a jar full of fog in the basement and open it.', 'The fog slowly fills the room, and inside it…'],
    ['Our Halloween party has one guest that nobody invited.', 'The guest wears a very old costume and says…'],
  ];
  const jump = [
    'Tell us about the scariest movie or show you have seen. Did you watch the whole thing?',
    'Tell us about a time you were really scared, but it turned out to be nothing. What was it?',
    'What was your best costume ever? Who helped you make it, and where did you wear it?',
    'Do you believe in ghosts? Tell us why or why not.',
    'Tell us a ghost story from your town or your country. Who told it to you?',
    'What scary stories did you hear as a child? Did they work on you?',
    'If you could be any monster for one day, which one would you be? What would you do?',
    'Tell us about a place that feels a little scary to you. Why does it feel that way?',
    'How do people in your country celebrate Halloween, or a festival for ghosts or the dead?',
    'Plan the perfect Halloween party for this group. What food, music and games do we need?',
    'Imagine you must stay one night in a haunted house. How do you get ready?',
    'What are you most afraid of, and how do you deal with it?',
    'Tell us about a strange dream you still remember. What happened in it?',
    'If a ghost lived in your home, what kind of ghost would you want it to be?',
    'What is the best candy or snack for Halloween? Try to make everyone agree with you.',
    'Tell us about a time the power went out at night. What did you do?',
    'Would you rather meet a friendly vampire or a friendly werewolf? Explain your choice.',
    'Tell us about a superstition you know. Do you follow it, even a little?',
    'Design a new Halloween monster. What does it look like, and what scares it?',
    'Tell us about a strange noise you heard at night. What was it in the end?',
    'What makes a scary story really good? Give us an example.',
    'Imagine our group is stuck in a haunted castle. What job does each person here have?',
    'Do you like scary things, like haunted houses and horror games? Why or why not?',
    'Tell us about the best trick or joke you ever played on someone.',
    'If you could ask a ghost one question, what would it be, and why?',
    'Your pet starts acting very strangely on Halloween night. What do you do?',
    'Tell us about an old building near you. What stories do people tell about it?',
    'You are a monster hunter for one night. What do you take with you, and why?',
    'Which is scarier: the dark, being alone, or big spiders? Make your case.',
    'Tell us about a festival night or holiday night you will never forget.',
  ];
  const takeItems = Object.freeze(take.map(([question, starter], index) => Object.freeze({
    id: 'cut-halloween-' + String(index + 1).padStart(2, '0'), category: 'halloween', question, starter,
  })));
  const jumpItems = Object.freeze(jump.map((question, index) => Object.freeze({
    id: 'jump-halloween-' + String(index + 1).padStart(2, '0'), category: 'halloween', question,
  })));
  return Object.freeze({
    take: Object.freeze({ items: takeItems, categories: Object.freeze(['mixed', 'halloween']) }),
    jump: Object.freeze({ items: jumpItems, categories: Object.freeze(['mixed', 'halloween']) }),
  });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_HALLOWEEN_TOPICS;
