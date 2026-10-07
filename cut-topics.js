/* Easy English story openings: 36 everyday situations and 24 wild situations.
 * "Real" describes the starting situation; everyone is free to make it up.
 * Add prompts here without changing the screens or the game rules.
 */
var CUT_TOPICS = (() => {
  'use strict';
  const real = [
    ['Imagine we all go on a trip. What goes wrong first?', 'The trouble starts when…'],
    ['We all live in one house. Who causes the first problem?', 'On our first night together…'],
    ['Tell us about a time you almost got in trouble. You can make it up.', 'I thought nobody would notice, but…'],
    ['You arrive at a date and something feels very wrong. What happened?', 'I sit down and suddenly…'],
    ['Why would someone here be a very bad roommate?', 'At first, living together seems fine, until…'],
    ['Someone here becomes famous for an embarrassing reason. What happened?', 'The video goes online because…'],
    ['We open a small cafe together. Why does our first day go wrong?', 'Our first customer asks for…'],
    ['You send a message to the wrong group chat. What happens next?', 'I press send, and then I realize…'],
    ['We get lost on the way to a wedding. Who has a plan?', 'Someone says they know a shortcut, but…'],
    ['You find a strange note in your bag. What does it say?', 'I open the note and it says…'],
    ['We share a hotel room. What keeps everyone awake?', 'Just as we fall asleep…'],
    ['Someone here should never become a teacher. Explain why.', 'On their first day at school…'],
    ['You invite everyone here to dinner. What is the big surprise?', 'I open the kitchen door and…'],
    ['Someone borrows your phone for one minute. What goes wrong?', 'They promise to be quick, but…'],
    ['We try to make a surprise birthday party. Why is it no longer a surprise?', 'Everything is ready until…'],
    ['Your boss sits next to you on a long flight. What happens?', 'I try to look busy, but…'],
    ['You meet an old friend who remembers something you want to forget.', 'They smile and say…'],
    ['We enter a cooking contest. Why does the judge look worried?', 'Our special dish is almost ready when…'],
    ['Someone here has to look after a pet for a weekend. What happens?', 'The owner leaves, and then…'],
    ['We are stuck in an elevator together. What do we discover?', 'After ten minutes, someone admits…'],
    ['You receive a package you did not order. What is inside?', 'I open the box and find…'],
    ['We go camping together. What happens in the middle of the night?', 'We hear a noise outside, so…'],
    ['Someone here starts a new job. What is their first big mistake?', 'They want to impress the boss, so…'],
    ['You decide to be honest for a whole day. What goes wrong?', 'The first person asks me…'],
    ['We miss the last train. What is our plan?', 'Someone offers to help, but…'],
    ['Your parents visit without warning. What do they find?', 'I open the door and immediately…'],
    ['Someone here is in charge of our money for a trip. What happens?', 'We need to pay for the hotel, but…'],
    ['We try to take one nice group photo. Why is it so difficult?', 'Just before the camera clicks…'],
    ['You accidentally wear the wrong clothes to an important event.', 'Everyone turns to look at me because…'],
    ['We try a dance class together. What happens in the first lesson?', 'The teacher asks us to…'],
    ['You hear your name in a conversation you were not meant to hear.', 'I stop behind the door because…'],
    ['Someone here plans a perfect day out. What changes the plan?', 'They say nothing can go wrong, and then…'],
    ['We swap jobs for one day. Who has the hardest day and why?', 'Everything looks easy until…'],
    ['You have to explain a strange photo on your phone.', 'There is a very good reason, because…'],
    ['We accidentally get locked inside a supermarket overnight.', 'At first we celebrate, but…'],
    ['You wake up and realize you forgot something important yesterday.', 'I look at my phone and…'],
  ];
  const absurd = [
    ['One person here is secretly an alien. How do we find out?', 'We first become suspicious when…'],
    ['A tiny dragon moves into our kitchen. What does it want?', 'The dragon refuses to leave because…'],
    ['We wake up with one strange superpower each. What goes wrong?', 'Someone tries their new power and…'],
    ['Your fridge starts giving life advice. What does it say?', 'I open it for a snack, but…'],
    ['We become the leaders of a very small country. What is our first problem?', 'On our first day in charge…'],
    ['Everyone here turns into an animal for one day. What happens?', 'We try to leave the house, but…'],
    ['A robot replaces one person here. Why do we notice?', 'Everything seems normal until…'],
    ['We open a hotel for ghosts. Why does the first guest complain?', 'The ghost asks to speak to the manager because…'],
    ['The moon sends us a bill. What are we paying for?', 'The letter says we owe money because…'],
    ['A time machine brings us to yesterday. What do we change by accident?', 'We promise not to touch anything, but…'],
    ['Your shoes can talk. What secret do they tell everyone?', 'During a quiet meeting, my shoes say…'],
    ['We have to babysit a giant baby. What goes wrong?', 'The baby begins to cry because…'],
    ['A fish offers to teach us how to swim. Why is the lesson strange?', 'The fish gives us one rule…'],
    ['We find a magic button that gives terrible prizes.', 'Someone presses it, and suddenly…'],
    ['Our shadows go on strike. What do they want?', 'They refuse to follow us until…'],
    ['A dinosaur joins our group trip. What is the first problem?', 'At the airport, the dinosaur…'],
    ['Everyone can hear your thoughts for ten seconds. What happens?', 'I try to think about something nice, but…'],
    ['A wizard gives us one wish, but misunderstands it.', 'We ask for a better life, and then…'],
    ['We have to hide a spaceship before our neighbors arrive.', 'Everything fits in the garage except…'],
    ['Your bed takes you somewhere new every night.', 'This morning I wake up in…'],
    ['We open a restaurant where the food talks back.', 'The first customer orders soup, but…'],
    ['A talking cat announces that it is our new boss.', 'Its first instruction is…'],
    ['We enter a talent show on another planet. Why do the aliens laugh?', 'Our performance starts well until…'],
    ['Gravity stops working only in this room. What do we do?', 'Someone tries to stand up and…'],
  ];
  const make = (rows, category) => rows.map(([question, starter], index) => Object.freeze({
    id: 'cut-' + category + '-' + String(index + 1).padStart(2, '0'), category, question, starter,
  }));
  const items = Object.freeze([...make(real, 'real'), ...make(absurd, 'absurd')]);
  return Object.freeze({ items, categories: Object.freeze(['mixed', 'real', 'absurd']) });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CUT_TOPICS;
