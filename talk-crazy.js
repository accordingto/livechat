/* Original, short English prompts for the optional Crazy Talk mode.
 * Lines are ready to say. Tasks give one clear, immediate spoken action.
 * No physical dares or real accusations. The public pool is not a secret;
 * only each saved assignment is private. Keep the original 96 prompts and IDs unchanged.
 */
var TALK_CRAZY = (() => {
  'use strict';
  const lines = [
    'I\'m in love with my cup.',
    'I love Indian accents.',
    'I like the smell of my feet.',
    'I want to marry my pillow.',
    'My belly just said hello.',
    'I am secretly three chickens.',
    'My left foot wants a divorce.',
    'My cup understands me.',
    'I kissed my sandwich goodbye.',
    'My eyebrows are judging you.',
    'I miss my past life as a chicken.',
    'My knees are older than me.',
    'My socks deserve a love song.',
    'I am too handsome to wash dishes.',
    'My armpits have formed a band.',
    'I think my feet are flirting.',
    'I eat noodles with my serious face.',
    'My belly button is my best friend.',
    'I would like to date the moon.',
    'My dance moves scare the furniture.',
    'I am a very lonely piece of cheese.',
    'My left sock is the smart one.',
    'I slept like a baby. A screaming baby.',
    'I practice kissing with my cup.',
    'My voice is sponsored by cheese.',
    'My brain smells like burnt toast.',
    'I brought my sexy voice today.',
    'My nose deserves its own birthday.',
    'I want a tiny crown for each toe.',
    'My forehead is open for business.',
    'I am emotionally a boiled egg.',
    'I just fell in love with my lunch.',
    'I am the prettiest potato here.',
    'My toes have a secret club.',
    'I apologize to everyone except my chair.',
    'I think the ceiling is flirting with me.',
    'I have a chicken trapped in my voice.',
    'I am the president of bad dancing.',
    'I named my belly Sir Noodles.',
    'I smell like a rich onion.',
    'My hair woke up before me.',
    'My ears have stopped taking questions.',
    'I am saving this laugh for my wedding.',
    'I dream about kissing a giant noodle.',
    'I would hug a ghost for free.',
    'Please do not break my cup\'s heart.',
    'I want to smell a cloud.',
    'My shower knows all my songs.',
    'My mirror and I are dating.',
    'I love you more than my left sock.',
    'I am jealous of this chair\'s confidence.',
    'My tongue needs a holiday.',
    'I have a crush on my own laugh.',
    'My stomach just asked for a microphone.',
    'I think my shadow is prettier than me.',
    'I want to be someone\'s favorite potato.',
    'My feet smell expensive today.',
    'I came here to find a chicken husband.',
    'I think soup should have a belly button.',
    'I would kiss you, but my cup gets jealous.',
  ];
  const tasks = [
    'Cluck like a chicken.',
    'Speak like a robot.',
    'Say "I\'m in love with my cup."',
    'Ask "Do you like the smell of your feet?"',
    'Sing your next sentence.',
    'Say "I love you" in a different accent.',
    'Moo like a cow.',
    'Say "banana" like it is a secret.',
    'Talk like a sleepy baby.',
    'Say "Your Majesty" to someone.',
    'Make a fake burp.',
    'Say "My feet are famous."',
    'Whisper "The cheese is watching."',
    'Say "Breaking news!" before your next sentence.',
    'Say "Wow!" in three different voices.',
    'Laugh like an evil chicken.',
    'Say "I kissed my breakfast."',
    'Bark once, then say "Sorry."',
    'Tell your chair "I love you."',
    'Repeat someone\'s last word like a parrot.',
    'Say "I\'m a princess" in a deep voice.',
    'Say "Oh no!" in a tiny voice.',
    'Count to three like a hungry monster.',
    'Say "I\'m beautiful" like you just discovered it.',
    'Speak one sentence in slow motion.',
    'Make a goat sound.',
    'Introduce yourself as "Doctor Banana."',
    'Say "Clap, clap, clap!" like a bored crowd.',
    'Sing a silly song.',
    'Ask "Can I smell your socks?"',
    'Say "I object!" like a cartoon judge.',
    'Sigh like a tired elephant.',
    'Say "Please clap" after your next answer.',
    'Say "I missed you" to your cup.',
    'Ask "Would you date a chicken?"',
    'Make a kissing sound, then say "Oops."',
  ];
  const extraTasks = [
    "Quack like a dramatic duck.",
    "Ask \"Are your toes single?\"",
    "Tell someone \"Your elbows look romantic.\"",
    "Sing \"I miss my socks.\"",
    "Say \"Help!\" like a tiny mouse.",
    "Ask everyone to say \"banana\" together.",
    "Say \"I love noodles\" like a love song.",
    "Whisper \"My cup left me.\"",
    "Ask \"Can your feet sing?\"",
    "Say \"Please clap for my belly.\"",
    "Sing \"Sorry\" in a very sad voice.",
    "Say \"Yummy\" like an evil witch.",
    "Make a tiny dinosaur roar.",
    "Say \"Good morning\" like a confused rooster.",
    "Ask \"Would you marry a noodle?\"",
    "Tell someone \"Your ears look delicious.\"",
    "Sing someone's name.",
    "Say \"Excuse me\" like a fart.",
    "Scream \"My cup wants to marry me!\"",
    "Ask \"Is my nose famous?\"",
    "Say \"I'm shy\" in your loudest voice.",
    "Say \"Meow meow\" like a love song.",
    "Make a fake sneeze.",
    "Ask \"Who wants to date my eyebrows?\"",
    "Tell someone \"I trust your knees.\"",
    "Say \"We are married now\" very seriously.",
    "Beg everyone to clap for your voice.",
    "Say \"I'm a goose\" in a fancy voice.",
    "Make a sad trumpet sound.",
    "Ask \"Does your belly have a name?\""
  ];
  const extraLines = [
    "My burps sound like love songs.",
    "My nose thinks you smell delicious.",
    "My cup doesn't love me anymore.",
    "I want new eyebrows. These are broken.",
    "My butt is a famous singer.",
    "My socks are fighting over you.",
    "Please clap for my chicken voice.",
    "Please clap for my beautiful fart.",
    "I would marry your eyebrows.",
    "My parents are singing ducks."
  ];
  const pool = Object.freeze([
    ...lines.map(text => ({ kind: 'line', text })),
    ...tasks.map(text => ({ kind: 'task', text })),
    // Append after the complete original bank so saved mission IDs stay stable.
    ...extraTasks.map(text => ({ kind: 'task', text })),
    ...extraLines.map(text => ({ kind: 'line', text })),
  ].map((prompt, i) => Object.freeze({
    id: 'crazy-' + String(i + 1).padStart(3, '0'), ...prompt,
  })));
  // Public examples for a director who needs an idea. Translations explain
  // existing tasks; neither sampling nor the UI needs private room history.
  const inspirations = Object.freeze([
    ['crazy-061', '學雞叫。'],
    ['crazy-062', '像機器人一樣說話。'],
    ['crazy-063', '說「我愛上我的杯子了。」'],
    ['crazy-064', '問「你喜歡自己腳的味道嗎？」'],
    ['crazy-065', '把下一句話唱出來。'],
    ['crazy-066', '換個口音說「我愛你」。'],
    ['crazy-070', '對一個人說「陛下」。'],
    ['crazy-075', '用三種聲音說「哇！」'],
    ['crazy-078', '汪一聲，再說「對不起」。'],
    ['crazy-080', '像鸚鵡，重複別人最後一個字。'],
    ['crazy-089', '唱一首搞笑的歌。'],
    ['crazy-095', '問「你會跟雞約會嗎？」'],
    ['crazy-102', '請大家一起說「香蕉」。'],
    ['crazy-105', '問「你的腳會唱歌嗎？」'],
    ['crazy-113', '唱出一個人的名字。'],
    ['crazy-121', '對一個人說「我相信你的膝蓋」。'],
  ].map(([id, zh]) => Object.freeze({ ...pool.find(prompt => prompt.id === id), zh })));
  function inspirationChoices(options = {}) {
    const { count = 3, random = Math.random, exclude = [] } = options || {};
    const limit = Number.isInteger(count) ? Math.max(0, Math.min(count, inspirations.length)) : 3;
    const blocked = new Set(Array.isArray(exclude) ? exclude : []);
    const remaining = inspirations.filter(prompt => !blocked.has(prompt.id));
    const rng = typeof random === 'function' ? random : Math.random;
    const chosen = [];
    while (chosen.length < limit && remaining.length) {
      const value = Number(rng());
      const fraction = Number.isFinite(value) ? Math.max(0, Math.min(value, 1 - Number.EPSILON)) : 0;
      const index = Math.floor(fraction * remaining.length);
      chosen.push({ ...remaining.splice(index, 1)[0] });
    }
    return chosen;
  }
  return Object.freeze({ pool, inspirationChoices });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TALK_CRAZY;
